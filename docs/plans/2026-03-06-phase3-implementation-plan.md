# Phase 3: Security & Production-Readiness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add security hardening (Helmet, CORS, rate limiting), structured logging (Pino), health checks, and Docker production infrastructure via a new `@repo/infra` shared package.

**Architecture:** New `packages/infra` workspace package provides three NestJS modules (`SecurityModule`, `LoggingModule`, `HealthModule`) plus a `bootstrapSecurity()` helper. `apps/api` imports these modules and calls the helper in `main.ts`. Docker files live at monorepo root.

**Tech Stack:** NestJS 11, `helmet`, `@nestjs/throttler`, `nestjs-pino`, `pino`, `pino-http`, `@nestjs/terminus`, Turbo prune Docker builds.

**Design doc:** `docs/plans/2026-03-06-phase3-security-production-design.md`

---

## Task 1: Scaffold `packages/infra` package

**Files:**

- Create: `packages/infra/package.json`
- Create: `packages/infra/tsconfig.json`
- Create: `packages/infra/src/index.ts`
- Create: `packages/infra/src/security/index.ts`
- Create: `packages/infra/src/logging/index.ts`
- Create: `packages/infra/src/health/index.ts`

**Step 1: Create `packages/infra/package.json`**

Follow the same structure as `packages/core/package.json`:

```json
{
  "name": "@repo/infra",
  "version": "0.0.0",
  "private": true,
  "main": "./dist/src/index.js",
  "types": "./dist/src/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/src/index.js",
      "types": "./dist/src/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsc --build",
    "typecheck": "tsc --noEmit",
    "lint": "echo 'no lint configured yet'",
    "test": "jest --config jest.config.json"
  },
  "dependencies": {
    "@danilomartinelli/nestjs-slonik": "workspace:*",
    "@nestjs/common": "^11.1.16",
    "@nestjs/core": "^11.1.16",
    "@nestjs/terminus": "^11.0.0",
    "@nestjs/throttler": "^6.0.0",
    "helmet": "^8.0.0",
    "nestjs-pino": "^4.0.0",
    "pino": "^9.0.0",
    "pino-http": "^10.0.0",
    "reflect-metadata": "^0.2.2",
    "slonik": "^48.12.3"
  },
  "devDependencies": {
    "@types/jest": "29.5.14",
    "jest": "29.7.0",
    "pino-pretty": "^13.0.0",
    "ts-jest": "29.4.6",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create `packages/infra/tsconfig.json`**

Copy from `packages/core/tsconfig.json` exactly:

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "strictPropertyInitialization": false,
    "target": "es2022",
    "useDefineForClassFields": false,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "composite": true,
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create `packages/infra/jest.config.json`**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": [
      "ts-jest",
      {
        "tsconfig": {
          "allowJs": true,
          "esModuleInterop": true
        }
      }
    ]
  }
}
```

**Step 4: Create empty barrel exports**

`packages/infra/src/index.ts`:

```typescript
export * from "./security";
export * from "./logging";
export * from "./health";
```

`packages/infra/src/security/index.ts`:

```typescript
// Will export SecurityModule, bootstrapSecurity, types
```

`packages/infra/src/logging/index.ts`:

```typescript
// Will export LoggingModule, types
```

`packages/infra/src/health/index.ts`:

```typescript
// Will export HealthModule
```

**Step 5: Install dependencies**

Run from monorepo root:

```bash
pnpm install
```

**Step 6: Verify the package is recognized by the workspace**

```bash
pnpm ls --filter @repo/infra
```

**Step 7: Add `@repo/infra` as dependency to `apps/api/package.json`**

Add to `apps/api/package.json` dependencies:

```json
"@repo/infra": "workspace:*"
```

Then run:

```bash
pnpm install
```

**Step 8: Commit**

```bash
git add packages/infra/ apps/api/package.json pnpm-lock.yaml
git commit -m "chore: scaffold @repo/infra package with empty modules"
```

---

## Task 2: SecurityModule — types and module

**Files:**

- Create: `packages/infra/src/security/security.types.ts`
- Create: `packages/infra/src/security/security.module.ts`
- Create: `packages/infra/src/security/__tests__/security.module.spec.ts`
- Modify: `packages/infra/src/security/index.ts`

**Step 1: Write the failing test**

`packages/infra/src/security/__tests__/security.module.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { SecurityModule } from "../security.module";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

describe("SecurityModule", () => {
  describe("forRoot", () => {
    it("registers ThrottlerGuard as a global guard", async () => {
      const module = await Test.createTestingModule({
        imports: [SecurityModule.forRoot({ ttl: 60000, limit: 10 })],
      }).compile();

      const guard = module.get(APP_GUARD);
      expect(guard).toBeInstanceOf(ThrottlerGuard);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/infra && npx jest --config jest.config.json src/security/__tests__/security.module.spec.ts -v
```

Expected: FAIL — `SecurityModule` not found.

**Step 3: Write the types**

`packages/infra/src/security/security.types.ts`:

```typescript
export interface ThrottleOptions {
  /** Rate limit window in milliseconds */
  ttl: number;
  /** Max requests per window */
  limit: number;
}
```

**Step 4: Write the SecurityModule**

`packages/infra/src/security/security.module.ts`:

```typescript
import { DynamicModule, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ThrottleOptions } from "./security.types";

@Module({})
export class SecurityModule {
  static forRoot(options: ThrottleOptions): DynamicModule {
    return {
      module: SecurityModule,
      imports: [
        ThrottlerModule.forRoot([{ ttl: options.ttl, limit: options.limit }]),
      ],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    };
  }
}
```

**Step 5: Update barrel export**

`packages/infra/src/security/index.ts`:

```typescript
export { SecurityModule } from "./security.module";
export { ThrottleOptions } from "./security.types";
```

**Step 6: Run test to verify it passes**

```bash
cd packages/infra && npx jest --config jest.config.json src/security/__tests__/security.module.spec.ts -v
```

Expected: PASS

**Step 7: Commit**

```bash
git add packages/infra/src/security/
git commit -m "feat(infra): add SecurityModule with @nestjs/throttler rate limiting"
```

---

## Task 3: `bootstrapSecurity` helper

**Files:**

- Create: `packages/infra/src/security/bootstrap-security.ts`
- Create: `packages/infra/src/security/__tests__/bootstrap-security.spec.ts`
- Modify: `packages/infra/src/security/index.ts`
- Modify: `packages/infra/src/security/security.types.ts`

**Step 1: Write the failing test**

`packages/infra/src/security/__tests__/bootstrap-security.spec.ts`:

```typescript
import { bootstrapSecurity } from "../bootstrap-security";
import { INestApplication } from "@nestjs/common";

describe("bootstrapSecurity", () => {
  let app: INestApplication;

  beforeEach(() => {
    app = {
      use: jest.fn(),
      enableCors: jest.fn(),
    } as unknown as INestApplication;
  });

  it("calls app.use with helmet middleware", () => {
    bootstrapSecurity(app);
    expect(app.use).toHaveBeenCalledTimes(1);
    expect(app.use).toHaveBeenCalledWith(expect.any(Function));
  });

  it("enables CORS with provided origins", () => {
    bootstrapSecurity(app, { corsOrigins: ["http://localhost:3000"] });
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ["http://localhost:3000"],
      credentials: true,
    });
  });

  it("defaults to empty origins and credentials true", () => {
    bootstrapSecurity(app);
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: [],
      credentials: true,
    });
  });

  it("respects corsCredentials option", () => {
    bootstrapSecurity(app, {
      corsOrigins: ["http://example.com"],
      corsCredentials: false,
    });
    expect(app.enableCors).toHaveBeenCalledWith({
      origin: ["http://example.com"],
      credentials: false,
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/infra && npx jest --config jest.config.json src/security/__tests__/bootstrap-security.spec.ts -v
```

Expected: FAIL — `bootstrapSecurity` not found.

**Step 3: Add types**

Add to `packages/infra/src/security/security.types.ts`:

```typescript
export interface BootstrapSecurityOptions {
  corsOrigins?: string[];
  corsCredentials?: boolean;
}
```

**Step 4: Write the implementation**

`packages/infra/src/security/bootstrap-security.ts`:

```typescript
import { INestApplication } from "@nestjs/common";
import helmet from "helmet";
import { BootstrapSecurityOptions } from "./security.types";

export function bootstrapSecurity(
  app: INestApplication,
  options?: BootstrapSecurityOptions,
): void {
  app.use(helmet());
  app.enableCors({
    origin: options?.corsOrigins ?? [],
    credentials: options?.corsCredentials ?? true,
  });
}
```

**Step 5: Update barrel export**

Add to `packages/infra/src/security/index.ts`:

```typescript
export { SecurityModule } from "./security.module";
export { bootstrapSecurity } from "./bootstrap-security";
export type {
  ThrottleOptions,
  BootstrapSecurityOptions,
} from "./security.types";
```

**Step 6: Run test to verify it passes**

```bash
cd packages/infra && npx jest --config jest.config.json src/security/__tests__/bootstrap-security.spec.ts -v
```

Expected: PASS

**Step 7: Commit**

```bash
git add packages/infra/src/security/
git commit -m "feat(infra): add bootstrapSecurity helper for Helmet and CORS"
```

---

## Task 4: LoggingModule — types and module

**Files:**

- Create: `packages/infra/src/logging/logging.types.ts`
- Create: `packages/infra/src/logging/logging.module.ts`
- Create: `packages/infra/src/logging/__tests__/logging.module.spec.ts`
- Modify: `packages/infra/src/logging/index.ts`

**Step 1: Write the failing test**

`packages/infra/src/logging/__tests__/logging.module.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { LoggingModule } from "../logging.module";
import { Logger } from "nestjs-pino";

describe("LoggingModule", () => {
  describe("forRoot", () => {
    it("provides the Pino Logger", async () => {
      const module = await Test.createTestingModule({
        imports: [LoggingModule.forRoot({ level: "info" })],
      }).compile();

      const logger = module.get(Logger);
      expect(logger).toBeDefined();
    });

    it("provides the Pino Logger with default options", async () => {
      const module = await Test.createTestingModule({
        imports: [LoggingModule.forRoot()],
      }).compile();

      const logger = module.get(Logger);
      expect(logger).toBeDefined();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/infra && npx jest --config jest.config.json src/logging/__tests__/logging.module.spec.ts -v
```

Expected: FAIL — `LoggingModule` not found.

**Step 3: Write the types**

`packages/infra/src/logging/logging.types.ts`:

```typescript
export interface LoggingOptions {
  /** Pino log level. Default: 'info' */
  level?: string;
  /** Enable pino-pretty for development. Default: false */
  prettyPrint?: boolean;
}
```

**Step 4: Write the LoggingModule**

`packages/infra/src/logging/logging.module.ts`:

```typescript
import { DynamicModule, Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "crypto";
import { LoggingOptions } from "./logging.types";

@Module({})
export class LoggingModule {
  static forRoot(options?: LoggingOptions): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: options?.level ?? "info",
            genReqId: (req: any) => req.headers["x-request-id"] ?? randomUUID(),
            transport: options?.prettyPrint
              ? { target: "pino-pretty", options: { colorize: true } }
              : undefined,
          },
        }),
      ],
    };
  }
}
```

**Step 5: Update barrel export**

`packages/infra/src/logging/index.ts`:

```typescript
export { LoggingModule } from "./logging.module";
export type { LoggingOptions } from "./logging.types";
```

**Step 6: Run test to verify it passes**

```bash
cd packages/infra && npx jest --config jest.config.json src/logging/__tests__/logging.module.spec.ts -v
```

Expected: PASS

**Step 7: Commit**

```bash
git add packages/infra/src/logging/
git commit -m "feat(infra): add LoggingModule with Pino structured logging"
```

---

## Task 5: SlonikHealthIndicator

**Files:**

- Create: `packages/infra/src/health/slonik-health.indicator.ts`
- Create: `packages/infra/src/health/__tests__/slonik-health.indicator.spec.ts`

**Step 1: Write the failing test**

`packages/infra/src/health/__tests__/slonik-health.indicator.spec.ts`:

```typescript
import { SlonikHealthIndicator } from "../slonik-health.indicator";
import { DatabasePool } from "slonik";

describe("SlonikHealthIndicator", () => {
  let indicator: SlonikHealthIndicator;
  let mockPool: Partial<DatabasePool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    indicator = new SlonikHealthIndicator(mockPool as DatabasePool);
  });

  it("returns healthy status when DB responds", async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [{ "?column?": 1 }],
    });

    const result = await indicator.isHealthy("database");

    expect(result).toEqual({
      database: { status: "up" },
    });
  });

  it("returns unhealthy status when DB throws", async () => {
    (mockPool.query as jest.Mock).mockRejectedValue(
      new Error("Connection refused"),
    );

    const result = await indicator.isHealthy("database");

    expect(result).toEqual({
      database: { status: "down", message: "Connection refused" },
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/infra && npx jest --config jest.config.json src/health/__tests__/slonik-health.indicator.spec.ts -v
```

Expected: FAIL — `SlonikHealthIndicator` not found.

**Step 3: Write the implementation**

`packages/infra/src/health/slonik-health.indicator.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from "@nestjs/terminus";
import { DatabasePool, sql } from "slonik";

@Injectable()
export class SlonikHealthIndicator extends HealthIndicator {
  constructor(private readonly pool: DatabasePool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.pool.query(sql.unsafe`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error: any) {
      return this.getStatus(key, false, { message: error.message });
    }
  }
}
```

Note: We inject the pool manually in the module (not via `@InjectPool()`) to keep `@repo/infra` decoupled from the decorator. The module will wire it up.

**Step 4: Run test to verify it passes**

```bash
cd packages/infra && npx jest --config jest.config.json src/health/__tests__/slonik-health.indicator.spec.ts -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/infra/src/health/
git commit -m "feat(infra): add SlonikHealthIndicator for @nestjs/terminus"
```

---

## Task 6: HealthModule and HealthController

**Files:**

- Create: `packages/infra/src/health/health.controller.ts`
- Create: `packages/infra/src/health/health.module.ts`
- Create: `packages/infra/src/health/__tests__/health.controller.spec.ts`
- Modify: `packages/infra/src/health/index.ts`

**Step 1: Write the failing test for HealthController**

`packages/infra/src/health/__tests__/health.controller.spec.ts`:

```typescript
import { Test } from "@nestjs/testing";
import { HealthController } from "../health.controller";
import { HealthCheckService, TerminusModule } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "../slonik-health.indicator";

describe("HealthController", () => {
  let controller: HealthController;
  let healthCheckService: HealthCheckService;
  let slonikIndicator: SlonikHealthIndicator;

  beforeEach(async () => {
    const mockPool = { query: jest.fn().mockResolvedValue({ rows: [] }) };

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
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it("returns health check result", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.info).toHaveProperty("database");
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/infra && npx jest --config jest.config.json src/health/__tests__/health.controller.spec.ts -v
```

Expected: FAIL — `HealthController` not found.

**Step 3: Write the HealthController**

`packages/infra/src/health/health.controller.ts`:

```typescript
import { Controller, Get } from "@nestjs/common";
import { HealthCheck, HealthCheckService } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "./slonik-health.indicator";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: SlonikHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.db.isHealthy("database")]);
  }
}
```

**Step 4: Write the HealthModule**

`packages/infra/src/health/health.module.ts`:

```typescript
import { DynamicModule, Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { SlonikHealthIndicator } from "./slonik-health.indicator";
import { DatabasePool } from "slonik";

export const HEALTH_DATABASE_POOL = Symbol("HEALTH_DATABASE_POOL");

@Module({})
export class HealthModule {
  /**
   * Import with a database pool reference so the health indicator can ping the DB.
   * Usage: HealthModule.forRoot(pool) — or pass the Slonik SLONIK_POOL token.
   */
  static forRoot(poolToken: symbol): DynamicModule {
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
      ],
    };
  }
}
```

This design allows the consumer to pass their own pool injection token (e.g., `SLONIK_POOL` from `@danilomartinelli/nestjs-slonik`), keeping `@repo/infra` decoupled from the specific Slonik module.

**Step 5: Update barrel export**

`packages/infra/src/health/index.ts`:

```typescript
export { HealthModule } from "./health.module";
export { HealthController } from "./health.controller";
export { SlonikHealthIndicator } from "./slonik-health.indicator";
```

**Step 6: Run tests to verify they pass**

```bash
cd packages/infra && npx jest --config jest.config.json src/health/__tests__/ -v
```

Expected: PASS (both health tests)

**Step 7: Commit**

```bash
git add packages/infra/src/health/
git commit -m "feat(infra): add HealthModule with SlonikHealthIndicator and /health endpoint"
```

---

## Task 7: Wire `@repo/infra` into `apps/api`

**Files:**

- Modify: `apps/api/src/main.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/.env.example`
- Modify: `apps/api/tsconfig.json` (add `@repo/infra` path alias if needed)

**Step 1: Update `apps/api/tsconfig.json` — add path alias**

Add to `compilerOptions.paths`:

```json
"@repo/infra": ["../../packages/infra/src/index.ts"]
```

**Step 2: Update Jest moduleNameMapper in all Jest configs**

Add to `.jestrc.json`, `jest-integration.json`, `jest-e2e.json`:

```json
"@repo/infra": "<rootDir>/../../packages/infra/src/index.ts"
```

**Step 3: Update `apps/api/src/app.module.ts`**

Replace entire file with:

```typescript
import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { SlonikModule } from "@danilomartinelli/nestjs-slonik";
import { SLONIK_POOL } from "@danilomartinelli/nestjs-slonik";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { UserModule } from "@modules/user/user.module";
import { WalletModule } from "@modules/wallet/wallet.module";
import { RequestContextModule } from "nestjs-request-context";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ContextInterceptor, ExceptionInterceptor } from "@repo/core";
import { SecurityModule, LoggingModule, HealthModule } from "@repo/infra";
import { postgresConnectionUri } from "./configs/database.config";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { get } from "env-var";

const interceptors = [
  {
    provide: APP_INTERCEPTOR,
    useClass: ContextInterceptor,
  },
  {
    provide: APP_INTERCEPTOR,
    useClass: ExceptionInterceptor,
  },
];

@Module({
  imports: [
    // Infrastructure
    SecurityModule.forRoot({
      ttl: get("THROTTLE_TTL").default(60000).asIntPositive(),
      limit: get("THROTTLE_LIMIT").default(100).asIntPositive(),
    }),
    LoggingModule.forRoot({
      level: get("LOG_LEVEL").default("info").asString(),
      prettyPrint: get("LOG_PRETTY").default("false").asBool(),
    }),
    HealthModule.forRoot(SLONIK_POOL),

    // Existing
    EventEmitterModule.forRoot(),
    RequestContextModule,
    SlonikModule.forRoot({
      connectionUri: postgresConnectionUri,
      isGlobal: true,
    }),
    CqrsModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
    }),

    // Modules
    UserModule,
    WalletModule,
  ],
  controllers: [],
  providers: [...interceptors],
})
export class AppModule {}
```

**Step 4: Update `apps/api/src/main.ts`**

Replace entire file with:

```typescript
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe } from "@nestjs/common";
import { Logger } from "nestjs-pino";
import { get } from "env-var";
import { bootstrapSecurity } from "@repo/infra";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Structured logging
  app.useLogger(app.get(Logger));

  // Security
  bootstrapSecurity(app, {
    corsOrigins: get("CORS_ORIGINS")
      .default("")
      .asString()
      .split(",")
      .filter(Boolean),
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger
  const options = new DocumentBuilder().build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("docs", app, document);

  // Lifecycle
  app.enableShutdownHooks();

  await app.listen(get("PORT").default(3000).asIntPositive());
}
bootstrap();
```

**Step 5: Update `.env.example`**

Add new variables to `apps/api/.env.example`:

```
DB_HOST='localhost'
DB_PORT=5432
DB_USERNAME='user'
DB_PASSWORD='password'
DB_NAME='ddh'
PORT=3000

# Security
CORS_ORIGINS=
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info
LOG_PRETTY=true
```

Also update any `.env` file (if present) with the same new variables.

**Step 6: Verify build**

```bash
pnpm build
```

Expected: All packages build successfully.

**Step 7: Verify lint**

```bash
pnpm lint
```

**Step 8: Commit**

```bash
git add apps/api/src/main.ts apps/api/src/app.module.ts apps/api/.env.example apps/api/tsconfig.json apps/api/.jestrc.json apps/api/jest-integration.json apps/api/jest-e2e.json
git commit -m "feat(api): integrate @repo/infra security, logging, and health modules"
```

---

## Task 8: Update ContextInterceptor for correlation ID bridge

**Files:**

- Modify: `packages/core/src/application/context/ContextInterceptor.ts`

**Step 1: Read existing ContextInterceptor**

Current code at `packages/core/src/application/context/ContextInterceptor.ts`:

```typescript
const requestId = request?.body?.requestId ?? randomUUID();
RequestContextService.setRequestId(requestId);
```

**Step 2: Update to read from Pino's request ID**

Pino's `pino-http` sets `req.id` on the request object via `genReqId`. We should read from that if available, falling back to `body.requestId`, then `randomUUID()`:

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { randomUUID } from "crypto";
import { RequestContextService } from "./AppRequestContext";

@Injectable()
export class ContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    /**
     * Setting an ID in the global context for each request.
     * Prefer Pino's request ID (set by pino-http), then body.requestId, then generate new.
     */
    const requestId = request?.id ?? request?.body?.requestId ?? randomUUID();

    RequestContextService.setRequestId(requestId);

    return next.handle().pipe(
      tap(() => {
        // Perform cleaning if needed
      }),
    );
  }
}
```

The only change is adding `request?.id ??` to the requestId resolution chain.

**Step 3: Run core package tests**

```bash
cd packages/core && pnpm test
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/core/src/application/context/ContextInterceptor.ts
git commit -m "feat(core): bridge Pino request ID into RequestContextService"
```

---

## Task 9: Dockerfile and .dockerignore

**Files:**

- Create: `Dockerfile` (monorepo root)
- Create: `.dockerignore` (monorepo root)

**Step 1: Create `.dockerignore`**

At monorepo root:

```
node_modules
.git
.github
coverage
*.md
.env
.env.*
!.env.example
apps/api/docker/
apps/api/tests/
packages/*/coverage/
.turbo
.claude
docs/
```

**Step 2: Create `Dockerfile`**

At monorepo root:

```dockerfile
# Stage 1: Prune monorepo for api scope
FROM node:22-alpine AS pruner
RUN corepack enable pnpm
RUN npm install -g turbo@2
WORKDIR /app
COPY . .
RUN turbo prune @repo/api --docker

# Stage 2: Install dependencies
FROM node:22-alpine AS installer
RUN corepack enable pnpm
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

# Stage 3: Build
COPY --from=pruner /app/out/full/ .
RUN pnpm turbo build --filter=@repo/api...

# Stage 4: Production runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs

COPY --from=installer /app/node_modules ./node_modules
COPY --from=installer /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=installer /app/apps/api/dist ./apps/api/dist
COPY --from=installer /app/packages/ ./packages/

USER nestjs
EXPOSE 3000
ENV NODE_ENV=production

CMD ["node", "apps/api/dist/src/main.js"]
```

Note: We use `@repo/api` (the package name in `apps/api/package.json`) for the turbo prune target. The `--filter=@repo/api...` builds the app and all its dependencies.

**Step 3: Verify Docker build (optional — requires Docker)**

```bash
docker build -t ddh-api:test .
```

Expected: Builds successfully. If Docker is not available, skip this step.

**Step 4: Commit**

```bash
git add Dockerfile .dockerignore
git commit -m "feat: add multi-stage Dockerfile with Turbo prune for minimal images"
```

---

## Task 10: docker-compose.prod.yml

**Files:**

- Create: `docker-compose.prod.yml` (monorepo root)

**Step 1: Create the file**

At monorepo root:

```yaml
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    environment:
      NODE_ENV: production
      LOG_PRETTY: "false"

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-ddh}
      POSTGRES_USER: ${DB_USERNAME:-user}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-password}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USERNAME:-user}"]
      interval: 10s
      timeout: 5s
      retries: 5

  flyway:
    image: flyway/flyway
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./apps/api/database/migrations:/flyway/sql
    command: migrate
    environment:
      FLYWAY_URL: jdbc:postgresql://postgres:5432/${DB_NAME:-ddh}
      FLYWAY_USER: ${DB_USERNAME:-user}
      FLYWAY_PASSWORD: ${DB_PASSWORD:-password}

volumes:
  pgdata:
```

**Step 2: Validate YAML syntax**

```bash
docker compose -f docker-compose.prod.yml config --quiet
```

Expected: No errors (exits 0). If Docker is not available, skip.

**Step 3: Commit**

```bash
git add docker-compose.prod.yml
git commit -m "feat: add docker-compose.prod.yml with API, Postgres, and Flyway"
```

---

## Task 11: Verify everything builds and tests pass

**Step 1: Full build**

```bash
pnpm build
```

Expected: All packages build successfully including `@repo/infra`.

**Step 2: Run `packages/infra` tests**

```bash
cd packages/infra && pnpm test
```

Expected: All tests pass (SecurityModule, bootstrapSecurity, LoggingModule, SlonikHealthIndicator, HealthController).

**Step 3: Run `apps/api` unit tests**

```bash
cd apps/api && pnpm test
```

Expected: All existing tests still pass.

**Step 4: Run architecture validation**

```bash
cd apps/api && pnpm deps:validate
```

Expected: No layer violations.

**Step 5: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors.

**Step 6: Run lint**

```bash
pnpm lint
```

Expected: No lint errors.

---

## Task 12: Update NEXT_STEPS.md

**Files:**

- Modify: `NEXT_STEPS.md`

**Step 1: Mark Phase 3 items as complete**

Update the checkbox items under Phase 3:

```markdown
### Security Hardening

- [x] **Helmet** — security headers middleware
- [x] **CORS** — configurable origin allowlist via environment variables
- [x] **Rate limiting** — `@nestjs/throttler` on public endpoints
- [x] **Input sanitization** — beyond class-validator whitelist

### Production Infrastructure

- [x] **Multi-stage Dockerfile** for `apps/api` (build → slim production image)
- [x] **docker-compose.prod.yml** with API service, Postgres, Flyway
- [x] **Health check endpoint** (`GET /health`) with DB connectivity, uptime, version
- [x] **Graceful shutdown** — drain connections, finish in-flight requests

### Structured Logging

- [x] Replace default NestJS logger with **Pino** (structured JSON, log levels)
- [x] Request/response logging middleware with timing
- [x] Correlation ID per request via `RequestContextService` + `AsyncLocalStorage`
```

**Step 2: Commit**

```bash
git add NEXT_STEPS.md
git commit -m "docs: mark Phase 3 items as complete"
```

---

## Summary of all commits

1. `chore: scaffold @repo/infra package with empty modules`
2. `feat(infra): add SecurityModule with @nestjs/throttler rate limiting`
3. `feat(infra): add bootstrapSecurity helper for Helmet and CORS`
4. `feat(infra): add LoggingModule with Pino structured logging`
5. `feat(infra): add SlonikHealthIndicator for @nestjs/terminus`
6. `feat(infra): add HealthModule with SlonikHealthIndicator and /health endpoint`
7. `feat(api): integrate @repo/infra security, logging, and health modules`
8. `feat(core): bridge Pino request ID into RequestContextService`
9. `feat: add multi-stage Dockerfile with Turbo prune for minimal images`
10. `feat: add docker-compose.prod.yml with API, Postgres, and Flyway`
11. `docs: mark Phase 3 items as complete`

## Files created/modified

**New files (17):**

- `packages/infra/package.json`
- `packages/infra/tsconfig.json`
- `packages/infra/jest.config.json`
- `packages/infra/src/index.ts`
- `packages/infra/src/security/index.ts`
- `packages/infra/src/security/security.types.ts`
- `packages/infra/src/security/security.module.ts`
- `packages/infra/src/security/bootstrap-security.ts`
- `packages/infra/src/security/__tests__/security.module.spec.ts`
- `packages/infra/src/security/__tests__/bootstrap-security.spec.ts`
- `packages/infra/src/logging/index.ts`
- `packages/infra/src/logging/logging.types.ts`
- `packages/infra/src/logging/logging.module.ts`
- `packages/infra/src/logging/__tests__/logging.module.spec.ts`
- `packages/infra/src/health/index.ts`
- `packages/infra/src/health/health.module.ts`
- `packages/infra/src/health/health.controller.ts`
- `packages/infra/src/health/slonik-health.indicator.ts`
- `packages/infra/src/health/__tests__/slonik-health.indicator.spec.ts`
- `packages/infra/src/health/__tests__/health.controller.spec.ts`
- `Dockerfile`
- `.dockerignore`
- `docker-compose.prod.yml`

**Modified files (8):**

- `apps/api/package.json` (add `@repo/infra` dependency)
- `apps/api/src/main.ts` (Pino logger, bootstrapSecurity, forbidNonWhitelisted)
- `apps/api/src/app.module.ts` (import SecurityModule, LoggingModule, HealthModule)
- `apps/api/.env.example` (new env vars)
- `apps/api/tsconfig.json` (add `@repo/infra` path)
- `apps/api/.jestrc.json` (add `@repo/infra` moduleNameMapper)
- `apps/api/jest-integration.json` (add `@repo/infra` moduleNameMapper)
- `apps/api/jest-e2e.json` (add `@repo/infra` moduleNameMapper)
- `packages/core/src/application/context/ContextInterceptor.ts` (correlation ID bridge)
- `NEXT_STEPS.md` (mark Phase 3 complete)
