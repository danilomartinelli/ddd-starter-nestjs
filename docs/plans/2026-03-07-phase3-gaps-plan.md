# Phase 3 Gaps Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the two remaining Phase 3 items — input sanitization decorators and health check uptime/version/environment.

**Architecture:** Custom `@SanitizeHtml()` and `@Trim()` decorators in `packages/infra` using `class-transformer`'s `@Transform` + `sanitize-html`. A new `AppHealthIndicator` in `packages/infra` extending `@nestjs/terminus` `HealthIndicator` for app metadata. Both follow the existing infra package patterns.

**Tech Stack:** `sanitize-html`, `class-transformer`, `@nestjs/terminus`, Jest

---

### Task 1: Install sanitize-html dependency

**Files:**

- Modify: `packages/infra/package.json`

**Step 1: Install the library**

Run from repo root:

```bash
cd packages/infra && pnpm add sanitize-html && pnpm add -D @types/sanitize-html
```

**Step 2: Verify it installed**

Run: `cat packages/infra/package.json | grep sanitize-html`
Expected: `"sanitize-html": "^X.X.X"` in dependencies and `"@types/sanitize-html"` in devDependencies.

**Step 3: Also install class-transformer in packages/infra**

The `@Transform` decorator comes from `class-transformer`. Check if it's already a dependency of `packages/infra`:

Run: `cat packages/infra/package.json | grep class-transformer`

If missing, install it:

```bash
cd packages/infra && pnpm add class-transformer
```

**Step 4: Commit**

```bash
git add packages/infra/package.json pnpm-lock.yaml
git commit -m "chore: add sanitize-html and class-transformer to packages/infra"
```

---

### Task 2: Create sanitize decorators

**Files:**

- Create: `packages/infra/src/security/decorators/sanitize.decorators.ts`

**Step 1: Write the failing test first (Task 3), then come back here**

Skip to Task 3, write the test, confirm it fails, then return here.

**Step 2: Create the decorator file**

Create `packages/infra/src/security/decorators/sanitize.decorators.ts`:

```typescript
import { Transform } from "class-transformer";
import sanitize from "sanitize-html";

export function SanitizeHtml(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }
    return sanitize(value, { allowedTags: [], allowedAttributes: {} });
  });
}

export function Trim(): PropertyDecorator {
  return Transform(({ value }) => {
    if (typeof value !== "string") {
      return value;
    }
    return value.trim();
  });
}
```

**Step 3: Run the test from Task 3 to verify it passes**

Run: `cd packages/infra && npx jest --config jest.config.json src/security/__tests__/sanitize.decorators.spec.ts --verbose`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add packages/infra/src/security/decorators/sanitize.decorators.ts packages/infra/src/security/__tests__/sanitize.decorators.spec.ts
git commit -m "feat(infra): add @SanitizeHtml and @Trim decorators"
```

---

### Task 3: Write sanitize decorator tests

**Files:**

- Create: `packages/infra/src/security/__tests__/sanitize.decorators.spec.ts`

**Step 1: Write the test**

Create `packages/infra/src/security/__tests__/sanitize.decorators.spec.ts`:

```typescript
import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { SanitizeHtml, Trim } from "../decorators/sanitize.decorators";

class TestDto {
  @SanitizeHtml()
  name: string;

  @Trim()
  trimmed: string;

  @SanitizeHtml()
  @Trim()
  both: string;
}

describe("SanitizeHtml", () => {
  it("strips script tags", () => {
    const result = plainToInstance(TestDto, {
      name: 'hello<script>alert("xss")</script>',
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe("hello");
  });

  it("strips all HTML tags", () => {
    const result = plainToInstance(TestDto, {
      name: "<b>bold</b> and <i>italic</i>",
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe("bold and italic");
  });

  it("preserves clean strings", () => {
    const result = plainToInstance(TestDto, {
      name: "John Doe",
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe("John Doe");
  });

  it("is a no-op for non-string values", () => {
    const result = plainToInstance(TestDto, {
      name: 42,
      trimmed: "x",
      both: "x",
    });
    expect(result.name).toBe(42);
  });
});

describe("Trim", () => {
  it("trims leading and trailing whitespace", () => {
    const result = plainToInstance(TestDto, {
      name: "x",
      trimmed: "  hello  ",
      both: "x",
    });
    expect(result.trimmed).toBe("hello");
  });

  it("is a no-op for non-string values", () => {
    const result = plainToInstance(TestDto, {
      name: "x",
      trimmed: 123,
      both: "x",
    });
    expect(result.trimmed).toBe(123);
  });
});

describe("SanitizeHtml + Trim combined", () => {
  it("sanitizes HTML and trims whitespace", () => {
    const result = plainToInstance(TestDto, {
      name: "x",
      trimmed: "x",
      both: "  <b>hello</b>  ",
    });
    expect(result.both).toBe("hello");
  });
});
```

**Step 2: Run to verify it fails**

Run: `cd packages/infra && npx jest --config jest.config.json src/security/__tests__/sanitize.decorators.spec.ts --verbose`
Expected: FAIL — Cannot find module `../decorators/sanitize.decorators`.

**Step 3: Now go back to Task 2 Step 2 to implement the decorators.**

---

### Task 4: Export sanitize decorators from packages/infra

**Files:**

- Modify: `packages/infra/src/security/index.ts`

**Step 1: Add the export**

Add to `packages/infra/src/security/index.ts`:

```typescript
export { SanitizeHtml, Trim } from "./decorators/sanitize.decorators";
```

The top-level `packages/infra/src/index.ts` already re-exports `./security`, so consumers can import via `@repo/infra`.

**Step 2: Verify build**

Run: `cd packages/infra && pnpm build`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add packages/infra/src/security/index.ts
git commit -m "feat(infra): export sanitize decorators from package barrel"
```

---

### Task 5: Apply decorators to existing DTOs

**Files:**

- Modify: `apps/api/src/modules/user/commands/create-user/create-user.request.dto.ts`
- Modify: `apps/api/src/modules/user/queries/find-users/find-users.request.dto.ts`

**Step 1: Update create-user.request.dto.ts**

Add import and decorators. The file should become:

```typescript
import { ApiProperty } from "@nestjs/swagger";
import {
  IsAlphanumeric,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";
import { SanitizeHtml, Trim } from "@repo/infra";

export class CreateUserRequestDto {
  @ApiProperty({
    example: "john@gmail.com",
    description: "User email address",
  })
  @SanitizeHtml()
  @Trim()
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  readonly email: string;

  @ApiProperty({ example: "France", description: "Country of residence" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(50)
  @MinLength(4)
  @IsString()
  @Matches(/^[a-zA-Z ]*$/)
  readonly country: string;

  @ApiProperty({ example: "28566", description: "Postal code" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(10)
  @MinLength(4)
  @IsAlphanumeric()
  readonly postalCode: string;

  @ApiProperty({ example: "Grande Rue", description: "Street" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(50)
  @MinLength(5)
  @Matches(/^[a-zA-Z ]*$/)
  readonly street: string;
}
```

**Step 2: Update find-users.request.dto.ts**

```typescript
import { ApiProperty } from "@nestjs/swagger";
import {
  MaxLength,
  IsString,
  IsAlphanumeric,
  Matches,
  IsOptional,
} from "class-validator";
import { SanitizeHtml, Trim } from "@repo/infra";

export class FindUsersRequestDto {
  @ApiProperty({ example: "France", description: "Country of residence" })
  @SanitizeHtml()
  @Trim()
  @IsOptional()
  @MaxLength(50)
  @IsString()
  @Matches(/^[a-zA-Z ]*$/)
  readonly country?: string;

  @ApiProperty({ example: "28566", description: "Postal code" })
  @SanitizeHtml()
  @Trim()
  @IsOptional()
  @MaxLength(10)
  @IsAlphanumeric()
  readonly postalCode?: string;

  @ApiProperty({ example: "Grande Rue", description: "Street" })
  @SanitizeHtml()
  @Trim()
  @IsOptional()
  @MaxLength(50)
  @Matches(/^[a-zA-Z ]*$/)
  readonly street?: string;
}
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: Compiles successfully.

**Step 4: Run existing tests**

Run: `cd apps/api && pnpm test`
Expected: All existing tests still pass.

**Step 5: Commit**

```bash
git add apps/api/src/modules/user/commands/create-user/create-user.request.dto.ts apps/api/src/modules/user/queries/find-users/find-users.request.dto.ts
git commit -m "feat(api): apply @SanitizeHtml and @Trim decorators to user DTOs"
```

---

### Task 6: Create AppHealthIndicator

**Files:**

- Create: `packages/infra/src/health/app-health.indicator.ts`

**Step 1: Write the failing test first (Task 7), then come back here**

Skip to Task 7, write the test, confirm it fails, then return here.

**Step 2: Create the indicator**

Create `packages/infra/src/health/app-health.indicator.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";

export interface AppHealthOptions {
  version: string;
}

@Injectable()
export class AppHealthIndicator extends HealthIndicator {
  constructor(private readonly options: AppHealthOptions) {
    super();
  }

  getAppInfo(key: string): HealthIndicatorResult {
    return this.getStatus(key, true, {
      uptime: Math.floor(process.uptime()),
      version: this.options.version,
      environment: process.env.NODE_ENV ?? "development",
    });
  }
}
```

**Step 3: Run the test from Task 7 to verify it passes**

Run: `cd packages/infra && npx jest --config jest.config.json src/health/__tests__/app-health.indicator.spec.ts --verbose`
Expected: All tests PASS.

**Step 4: Commit**

```bash
git add packages/infra/src/health/app-health.indicator.ts packages/infra/src/health/__tests__/app-health.indicator.spec.ts
git commit -m "feat(infra): add AppHealthIndicator with uptime, version, environment"
```

---

### Task 7: Write AppHealthIndicator tests

**Files:**

- Create: `packages/infra/src/health/__tests__/app-health.indicator.spec.ts`

**Step 1: Write the test**

Create `packages/infra/src/health/__tests__/app-health.indicator.spec.ts`:

```typescript
import { AppHealthIndicator } from "../app-health.indicator";

describe("AppHealthIndicator", () => {
  let indicator: AppHealthIndicator;

  beforeEach(() => {
    indicator = new AppHealthIndicator({ version: "1.2.3" });
  });

  it("returns app info with status up", () => {
    const result = indicator.getAppInfo("app");

    expect(result.app.status).toBe("up");
  });

  it("includes version from options", () => {
    const result = indicator.getAppInfo("app");

    expect(result.app.version).toBe("1.2.3");
  });

  it("includes uptime as a number", () => {
    const result = indicator.getAppInfo("app");

    expect(typeof result.app.uptime).toBe("number");
    expect(result.app.uptime).toBeGreaterThanOrEqual(0);
  });

  it("includes environment from NODE_ENV", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "test";

    const result = indicator.getAppInfo("app");

    expect(result.app.environment).toBe("test");
    process.env.NODE_ENV = originalEnv;
  });

  it("defaults environment to development when NODE_ENV is unset", () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;

    const result = indicator.getAppInfo("app");

    expect(result.app.environment).toBe("development");
    process.env.NODE_ENV = originalEnv;
  });
});
```

**Step 2: Run to verify it fails**

Run: `cd packages/infra && npx jest --config jest.config.json src/health/__tests__/app-health.indicator.spec.ts --verbose`
Expected: FAIL — Cannot find module `../app-health.indicator`.

**Step 3: Now go back to Task 6 Step 2 to implement the indicator.**

---

### Task 8: Wire AppHealthIndicator into HealthModule and HealthController

**Files:**

- Modify: `packages/infra/src/health/health.module.ts`
- Modify: `packages/infra/src/health/health.controller.ts`
- Modify: `packages/infra/src/health/index.ts`

**Step 1: Update health.module.ts**

Replace `packages/infra/src/health/health.module.ts` with:

```typescript
import { DynamicModule, Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { SlonikHealthIndicator } from "./slonik-health.indicator";
import { AppHealthIndicator, AppHealthOptions } from "./app-health.indicator";
import { DatabasePool } from "slonik";

export interface HealthModuleOptions extends AppHealthOptions {}

@Module({})
export class HealthModule {
  static forRoot(
    poolToken: symbol,
    options: HealthModuleOptions,
  ): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: SlonikHealthIndicator,
          useFactory: (pool: DatabasePool) => new SlonikHealthIndicator(pool),
          inject: [poolToken],
        },
        {
          provide: AppHealthIndicator,
          useFactory: () => new AppHealthIndicator(options),
        },
      ],
    };
  }
}
```

**Step 2: Update health.controller.ts**

Replace `packages/infra/src/health/health.controller.ts` with:

```typescript
import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "./slonik-health.indicator";
import { AppHealthIndicator } from "./app-health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: SlonikHealthIndicator,
    private readonly app: AppHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.isHealthy("database"),
      () => this.app.getAppInfo("app"),
    ]);
  }
}
```

**Step 3: Update health/index.ts**

Replace `packages/infra/src/health/index.ts` with:

```typescript
export { HealthModule } from "./health.module";
export type { HealthModuleOptions } from "./health.module";
export { HealthController } from "./health.controller";
export { SlonikHealthIndicator } from "./slonik-health.indicator";
export { AppHealthIndicator } from "./app-health.indicator";
export type { AppHealthOptions } from "./app-health.indicator";
```

**Step 4: Verify build**

Run: `cd packages/infra && pnpm build`
Expected: Compiles successfully.

**Step 5: Commit**

```bash
git add packages/infra/src/health/health.module.ts packages/infra/src/health/health.controller.ts packages/infra/src/health/index.ts
git commit -m "feat(infra): wire AppHealthIndicator into HealthModule and controller"
```

---

### Task 9: Update app.module.ts to pass version

**Files:**

- Modify: `apps/api/src/app.module.ts`

**Step 1: Update the HealthModule.forRoot() call**

In `apps/api/src/app.module.ts`, change:

```typescript
HealthModule.forRoot(SLONIK_POOL),
```

to:

```typescript
HealthModule.forRoot(SLONIK_POOL, { version: '2.0.0' }),
```

The version `'2.0.0'` matches `apps/api/package.json` `"version": "2.0.0"`.

**Step 2: Verify build**

Run: `pnpm build`
Expected: Compiles successfully.

**Step 3: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(api): pass app version to HealthModule"
```

---

### Task 10: Update HealthController test

**Files:**

- Modify: `packages/infra/src/health/__tests__/health.controller.spec.ts`

**Step 1: Update the test to include AppHealthIndicator**

Replace `packages/infra/src/health/__tests__/health.controller.spec.ts` with:

```typescript
import { Test } from "@nestjs/testing";
import { HealthController } from "../health.controller";
import { TerminusModule } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "../slonik-health.indicator";
import { AppHealthIndicator } from "../app-health.indicator";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: SlonikHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({
              database: { status: "up" },
            }),
          },
        },
        {
          provide: AppHealthIndicator,
          useValue: {
            getAppInfo: jest.fn().mockReturnValue({
              app: {
                status: "up",
                uptime: 100,
                version: "2.0.0",
                environment: "test",
              },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it("returns health check result with database and app info", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.info).toHaveProperty("database");
    expect(result.info).toHaveProperty("app");
  });
});
```

**Step 2: Run the test**

Run: `cd packages/infra && npx jest --config jest.config.json src/health/__tests__/health.controller.spec.ts --verbose`
Expected: PASS.

**Step 3: Run all infra tests**

Run: `cd packages/infra && pnpm test`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add packages/infra/src/health/__tests__/health.controller.spec.ts
git commit -m "test(infra): update health controller test for AppHealthIndicator"
```

---

### Task 11: Full build and test verification

**Step 1: Build everything**

Run: `pnpm build`
Expected: All packages compile.

**Step 2: Run all unit tests**

Run: `pnpm test`
Expected: All tests pass.

**Step 3: Run architecture validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: No dependency violations.

**Step 4: Lint**

Run: `pnpm lint`
Expected: No errors.
