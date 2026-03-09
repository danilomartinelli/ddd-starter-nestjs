# Real-World Production Template — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the DDD Hexagonal project into a complete, enterprise-grade reusable template for production APIs

**Architecture:** Bottom-up by layer. Each phase (5-10) adds a self-contained capability. Phase 5 (Auth) is the foundation — everything else builds on it. Phases 6-10 are mostly independent and can be parallelized.

**Tech Stack:** NestJS 11, Slonik (PostgreSQL), neverthrow, Zod, argon2, BullMQ, ioredis, opossum, @nestjs/schedule, @nestjs/bullmq, nodemailer

**Design Doc:** `docs/plans/2026-03-09-real-world-template-design.md`

---

## Phase 5: Auth & Identity

### Task 5.1: Migration V5 — password_hash and refresh_tokens table

**Files:**

- Create: `apps/api/database/migrations/V5__auth.sql`

**Step 1: Write the migration SQL**

```sql
-- V5__auth.sql
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

CREATE TABLE "refresh_tokens" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying NOT NULL,
  "tokenHash" character varying NOT NULL,
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  "revokedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
  CONSTRAINT "FK_refresh_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId");
CREATE INDEX "IDX_refresh_tokens_tokenHash" ON "refresh_tokens" ("tokenHash");
```

Note: Uses `character varying` and `"camelCase"` column naming to match existing migrations (V1-V4 convention).

**Step 2: Apply migration locally**

Run: `cd apps/api && pnpm docker:test:down && pnpm docker:test`
Expected: Flyway runs V5 migration successfully. Check docker logs for `Successfully applied 1 migration`.

**Step 3: Commit**

```bash
git add apps/api/database/migrations/V5__auth.sql
git commit -m "feat(auth): add V5 migration for password_hash and refresh_tokens"
```

---

### Task 5.2: Add argon2 dependency

**Files:**

- Modify: `apps/api/package.json`

**Step 1: Install argon2**

Run: `cd apps/api && pnpm add argon2`

**Step 2: Verify installation**

Run: `cd apps/api && node -e "const argon2 = require('argon2'); argon2.hash('test').then(h => console.log('OK:', h.substring(0,20)))"`
Expected: `OK: $argon2id$v=19$m=655`

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "feat(auth): add argon2 dependency for password hashing"
```

---

### Task 5.3: HashedPassword value object

**Files:**

- Create: `apps/api/src/modules/auth/domain/value-objects/hashed-password.value-object.ts`
- Create: `apps/api/src/modules/auth/domain/value-objects/__tests__/hashed-password.spec.ts`

**Step 1: Write the failing test**

```typescript
// hashed-password.spec.ts
import { HashedPassword } from "../hashed-password.value-object";

describe("HashedPassword", () => {
  describe("create", () => {
    it("hashes a plain text password", async () => {
      const hashed = await HashedPassword.create("MySecureP@ss1");
      expect(hashed.value).toMatch(/^\$argon2/);
    });

    it("rejects passwords shorter than 8 characters", async () => {
      await expect(HashedPassword.create("short")).rejects.toThrow(
        "Password must be at least 8 characters",
      );
    });
  });

  describe("verify", () => {
    it("returns true for correct password", async () => {
      const hashed = await HashedPassword.create("MySecureP@ss1");
      const result = await hashed.verify("MySecureP@ss1");
      expect(result).toBe(true);
    });

    it("returns false for incorrect password", async () => {
      const hashed = await HashedPassword.create("MySecureP@ss1");
      const result = await hashed.verify("WrongPassword");
      expect(result).toBe(false);
    });
  });

  describe("fromHash", () => {
    it("creates a HashedPassword from an existing hash", async () => {
      const original = await HashedPassword.create("MySecureP@ss1");
      const restored = HashedPassword.fromHash(original.value);
      const result = await restored.verify("MySecureP@ss1");
      expect(result).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/auth/domain/value-objects/__tests__/hashed-password.spec.ts -v`
Expected: FAIL — module not found

**Step 3: Write the implementation**

```typescript
// hashed-password.value-object.ts
import * as argon2 from "argon2";
import { ArgumentOutOfRangeException } from "@repo/core";

export class HashedPassword {
  private constructor(private readonly hash: string) {}

  get value(): string {
    return this.hash;
  }

  static async create(plainPassword: string): Promise<HashedPassword> {
    if (plainPassword.length < 8) {
      throw new ArgumentOutOfRangeException(
        "Password must be at least 8 characters",
      );
    }
    const hash = await argon2.hash(plainPassword);
    return new HashedPassword(hash);
  }

  static fromHash(hash: string): HashedPassword {
    return new HashedPassword(hash);
  }

  async verify(plainPassword: string): Promise<boolean> {
    return argon2.verify(this.hash, plainPassword);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/auth/domain/value-objects/__tests__/hashed-password.spec.ts -v`
Expected: 5 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/auth/domain/value-objects/
git commit -m "feat(auth): add HashedPassword value object with argon2"
```

---

### Task 5.4: Auth domain errors

**Files:**

- Create: `apps/api/src/modules/auth/domain/auth.errors.ts`
- Create: `apps/api/src/modules/auth/domain/__tests__/auth.errors.spec.ts`

**Step 1: Write the failing test**

```typescript
// auth.errors.spec.ts
import {
  InvalidCredentialsError,
  TokenExpiredError,
  TokenInvalidError,
} from "../auth.errors";

describe("Auth errors", () => {
  it("InvalidCredentialsError has correct code", () => {
    const error = new InvalidCredentialsError();
    expect(error.code).toBe("AUTH.INVALID_CREDENTIALS");
    expect(error.message).toBe("Invalid email or password");
  });

  it("TokenExpiredError has correct code", () => {
    const error = new TokenExpiredError();
    expect(error.code).toBe("AUTH.TOKEN_EXPIRED");
    expect(error.message).toBe("Token has expired");
  });

  it("TokenInvalidError has correct code", () => {
    const error = new TokenInvalidError();
    expect(error.code).toBe("AUTH.TOKEN_INVALID");
    expect(error.message).toBe("Token is invalid");
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/auth/domain/__tests__/auth.errors.spec.ts -v`
Expected: FAIL

**Step 3: Write the implementation**

```typescript
// auth.errors.ts
import { ExceptionBase } from "@repo/core";

export class InvalidCredentialsError extends ExceptionBase {
  static readonly message = "Invalid email or password";
  public readonly code = "AUTH.INVALID_CREDENTIALS";

  constructor(cause?: Error, metadata?: unknown) {
    super(InvalidCredentialsError.message, cause, metadata);
  }
}

export class TokenExpiredError extends ExceptionBase {
  static readonly message = "Token has expired";
  public readonly code = "AUTH.TOKEN_EXPIRED";

  constructor(cause?: Error, metadata?: unknown) {
    super(TokenExpiredError.message, cause, metadata);
  }
}

export class TokenInvalidError extends ExceptionBase {
  static readonly message = "Token is invalid";
  public readonly code = "AUTH.TOKEN_INVALID";

  constructor(cause?: Error, metadata?: unknown) {
    super(TokenInvalidError.message, cause, metadata);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/auth/domain/__tests__/auth.errors.spec.ts -v`
Expected: 3 tests PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/auth/domain/
git commit -m "feat(auth): add auth domain error classes"
```

---

### Task 5.5: Auth domain events

**Files:**

- Create: `apps/api/src/modules/auth/domain/events/user-logged-in.domain-event.ts`
- Create: `apps/api/src/modules/auth/domain/events/password-reset-requested.domain-event.ts`

**Step 1: Write the domain events**

```typescript
// user-logged-in.domain-event.ts
import { DomainEvent, DomainEventProps } from "@repo/core";

export class UserLoggedInDomainEvent extends DomainEvent {
  readonly userId: string;

  constructor(props: DomainEventProps<UserLoggedInDomainEvent>) {
    super(props);
    this.userId = props.userId;
  }
}
```

```typescript
// password-reset-requested.domain-event.ts
import { DomainEvent, DomainEventProps } from "@repo/core";

export class PasswordResetRequestedDomainEvent extends DomainEvent {
  readonly email: string;
  readonly resetToken: string;

  constructor(props: DomainEventProps<PasswordResetRequestedDomainEvent>) {
    super(props);
    this.email = props.email;
    this.resetToken = props.resetToken;
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/modules/auth/domain/events/
git commit -m "feat(auth): add auth domain events"
```

---

### Task 5.6: Update User entity and types with passwordHash

**Files:**

- Modify: `apps/api/src/modules/user/domain/user.types.ts`
- Modify: `apps/api/src/modules/user/domain/user.entity.ts`
- Modify: `apps/api/src/modules/user/database/user.schema.ts` (or wherever the schema is)
- Modify: `apps/api/src/modules/user/user.mapper.ts`
- Modify: `apps/api/tests/factories/user.factory.ts`

**Step 1: Update UserProps and CreateUserProps**

In `user.types.ts`, add `passwordHash: string` to `UserProps` and `password: string` to `CreateUserProps`.

**Step 2: Update UserEntity.create() to hash the password**

In `user.entity.ts`:

- Import `HashedPassword` from `@modules/auth/domain/value-objects/hashed-password.value-object`

**IMPORTANT DESIGN DECISION:** Because domain layer cannot depend on infrastructure, and `HashedPassword` uses `argon2` (an external lib), the hashing should happen in the application layer (command handler). The entity should receive the already-hashed password string. This keeps the entity synchronous and pure.

So instead:

- `CreateUserProps` gets `passwordHash: string` (already hashed by the command handler)
- `UserProps` gets `passwordHash: string`
- The `create()` factory stores it directly

```typescript
// In user.types.ts - add to both interfaces:
export interface UserProps {
  role: UserRoles;
  email: string;
  address: Address;
  passwordHash: string;
}

export interface CreateUserProps {
  email: string;
  address: Address;
  passwordHash: string;
}
```

**Step 3: Update user.entity.ts create factory**

```typescript
static create(create: CreateUserProps): UserEntity {
  const id = randomUUID();
  const props: UserProps = {
    ...create,
    role: UserRoles.guest,
  };
  // ... rest unchanged
}
```

**Step 4: Update the Zod schema to include passwordHash**

In the user schema file, add: `passwordHash: z.string()`

**Step 5: Update mapper toPersistence and toDomain**

In `user.mapper.ts`:

- `toPersistence`: add `passwordHash: copy.passwordHash`
- `toDomain`: add `passwordHash: record.passwordHash` to props
- `toResponse`: do NOT add passwordHash (never expose)

**Step 6: Update test factory**

In `user.factory.ts`:

- Add `passwordHash` with a default hash value (e.g., pre-computed argon2 hash of 'TestPassword1')
- For tests, use a constant hash to avoid async in factories

**Step 7: Run all existing tests to check for regressions**

Run: `cd apps/api && pnpm test`
Expected: Fix any broken tests due to missing `passwordHash` in test data. Update all test mocks and factories to include the new field.

**Step 8: Commit**

```bash
git add apps/api/src/modules/user/ apps/api/tests/factories/
git commit -m "feat(auth): add passwordHash to User entity and persistence"
```

---

### Task 5.7: Refresh token repository (port + implementation)

**Files:**

- Create: `apps/api/src/modules/auth/database/refresh-token.schema.ts`
- Create: `apps/api/src/modules/auth/database/refresh-token.repository.port.ts`
- Create: `apps/api/src/modules/auth/database/refresh-token.repository.ts`
- Create: `apps/api/src/modules/auth/auth.di-tokens.ts`

**Step 1: Write the Zod schema**

```typescript
// refresh-token.schema.ts
import { z } from "zod";

export const refreshTokenSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string().min(1),
  tokenHash: z.string().min(1),
  expiresAt: z.coerce.date(),
  revokedAt: z.coerce.date().nullable(),
});

export type RefreshTokenModel = z.infer<typeof refreshTokenSchema>;
```

**Step 2: Write the repository port**

```typescript
// refresh-token.repository.port.ts
import { RefreshTokenModel } from "./refresh-token.schema";

export interface RefreshTokenRepositoryPort {
  insert(model: RefreshTokenModel): Promise<void>;
  findByTokenHash(tokenHash: string): Promise<RefreshTokenModel | null>;
  revokeByUserId(userId: string): Promise<void>;
  revokeByTokenHash(tokenHash: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
```

**Step 3: Write the repository implementation**

```typescript
// refresh-token.repository.ts
import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { RefreshTokenRepositoryPort } from "./refresh-token.repository.port";
import { RefreshTokenModel, refreshTokenSchema } from "./refresh-token.schema";

@Injectable()
export class RefreshTokenRepository implements RefreshTokenRepositoryPort {
  private readonly logger = new Logger(RefreshTokenRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async insert(model: RefreshTokenModel): Promise<void> {
    const validated = refreshTokenSchema.parse(model);
    await this.pool.query(sql.type(refreshTokenSchema)`
      INSERT INTO "refresh_tokens" ("id", "createdAt", "updatedAt", "userId", "tokenHash", "expiresAt", "revokedAt")
      VALUES (${validated.id}, ${sql.timestamp(validated.createdAt)}, ${sql.timestamp(validated.updatedAt)}, ${validated.userId}, ${validated.tokenHash}, ${sql.timestamp(validated.expiresAt)}, ${null})
    `);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshTokenModel | null> {
    const result = await this.pool.query(sql.type(refreshTokenSchema)`
      SELECT * FROM "refresh_tokens"
      WHERE "tokenHash" = ${tokenHash} AND "revokedAt" IS NULL AND "expiresAt" > NOW()
    `);
    return result.rows[0] ?? null;
  }

  async revokeByUserId(userId: string): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE "refresh_tokens" SET "revokedAt" = NOW() WHERE "userId" = ${userId} AND "revokedAt" IS NULL
    `);
  }

  async revokeByTokenHash(tokenHash: string): Promise<void> {
    await this.pool.query(sql.unsafe`
      UPDATE "refresh_tokens" SET "revokedAt" = NOW() WHERE "tokenHash" = ${tokenHash}
    `);
  }

  async deleteExpired(): Promise<number> {
    const result = await this.pool.query(sql.unsafe`
      DELETE FROM "refresh_tokens" WHERE "expiresAt" < NOW()
    `);
    return result.rowCount;
  }
}
```

**Step 4: Write the DI tokens**

```typescript
// auth.di-tokens.ts
export const REFRESH_TOKEN_REPOSITORY = Symbol("REFRESH_TOKEN_REPOSITORY");
```

**Step 5: Commit**

```bash
git add apps/api/src/modules/auth/database/ apps/api/src/modules/auth/auth.di-tokens.ts
git commit -m "feat(auth): add refresh token repository port and implementation"
```

---

### Task 5.8: Auth routes configuration

**Files:**

- Modify: `apps/api/src/configs/app.routes.ts`

**Step 1: Add auth routes**

```typescript
// Add to app.routes.ts
const authRoot = "auth";

export const routesV1 = {
  version: v1,
  user: {
    root: usersRoot,
    delete: `/${usersRoot}/:id`,
  },
  wallet: {
    root: walletsRoot,
    delete: `/${walletsRoot}/:id`,
  },
  auth: {
    login: `/${authRoot}/login`,
    register: `/${authRoot}/register`,
    refresh: `/${authRoot}/refresh`,
    logout: `/${authRoot}/logout`,
  },
};
```

**Step 2: Commit**

```bash
git add apps/api/src/configs/app.routes.ts
git commit -m "feat(auth): add auth routes to app routes config"
```

---

### Task 5.9: Register command (BDD test + implementation)

**Files:**

- Create: `apps/api/src/modules/auth/commands/register/register.command.ts`
- Create: `apps/api/src/modules/auth/commands/register/register.service.ts`
- Create: `apps/api/src/modules/auth/commands/register/register.request.dto.ts`
- Create: `apps/api/src/modules/auth/commands/register/register.http.controller.ts`
- Create: `apps/api/src/modules/auth/commands/register/__tests__/register.feature`
- Create: `apps/api/src/modules/auth/commands/register/__tests__/register.spec.ts`

**Step 1: Write the feature file**

```gherkin
Feature: Register a new user (auth command handler)

  Scenario: Successfully registering a new user
    Given no user with email "john@test.com" exists
    When I execute the register command with email "john@test.com" and password "SecureP@ss1"
    Then the result is ok with access and refresh tokens

  Scenario: Failing to register with existing email
    Given a user with email "john@test.com" already exists
    When I execute the register command with email "john@test.com" and password "SecureP@ss1"
    Then the result is an error of type UserAlreadyExistsError
```

**Step 2: Write the command**

```typescript
// register.command.ts
import { Command, CommandProps } from "@repo/core";

export class RegisterCommand extends Command {
  readonly email: string;
  readonly password: string;
  readonly country: string;
  readonly postalCode: string;
  readonly street: string;

  constructor(props: CommandProps<RegisterCommand>) {
    super(props);
    this.email = props.email;
    this.password = props.password;
    this.country = props.country;
    this.postalCode = props.postalCode;
    this.street = props.street;
  }
}
```

**Step 3: Write the request DTO**

```typescript
// register.request.dto.ts
import { ApiProperty } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  Matches,
  IsAlphanumeric,
} from "class-validator";
import { SanitizeHtml, Trim } from "@repo/infra";

export class RegisterRequestDto {
  @ApiProperty({ example: "john@gmail.com" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(320)
  @MinLength(5)
  @IsEmail()
  readonly email: string;

  @ApiProperty({ example: "SecureP@ssw0rd" })
  @MaxLength(128)
  @MinLength(8)
  @IsString()
  readonly password: string;

  @ApiProperty({ example: "France" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(50)
  @MinLength(4)
  @IsString()
  @Matches(/^[a-zA-Z ]*$/)
  readonly country: string;

  @ApiProperty({ example: "28566" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(10)
  @MinLength(4)
  @IsAlphanumeric()
  readonly postalCode: string;

  @ApiProperty({ example: "Grande Rue" })
  @SanitizeHtml()
  @Trim()
  @MaxLength(50)
  @MinLength(5)
  @Matches(/^[a-zA-Z ]*$/)
  readonly street: string;
}
```

**Step 4: Write the service (command handler)**

The register service:

1. Hashes the password using `HashedPassword.create()`
2. Creates user via `CreateUserCommand` dispatched to `CommandBus`
3. Generates JWT access + refresh tokens
4. Persists refresh token

```typescript
// register.service.ts
import { CommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { CommandBus } from "@nestjs/cqrs";
import { err, ok, Result } from "neverthrow";
import { RegisterCommand } from "./register.command";
import { HashedPassword } from "../../domain/value-objects/hashed-password.value-object";
import { REFRESH_TOKEN_REPOSITORY } from "../../auth.di-tokens";
import { RefreshTokenRepositoryPort } from "../../database/refresh-token.repository.port";
import { UserAlreadyExistsError } from "@modules/user/domain/user.errors";
import { CreateUserCommand } from "@modules/user/commands/create-user/create-user.command";
import { randomUUID } from "crypto";
import { createHash } from "crypto";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@CommandHandler(RegisterCommand)
export class RegisterService {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
  ) {}

  async execute(
    command: RegisterCommand,
  ): Promise<Result<AuthTokens, UserAlreadyExistsError>> {
    const hashedPassword = await HashedPassword.create(command.password);

    const createUserCommand = new CreateUserCommand({
      email: command.email,
      country: command.country,
      postalCode: command.postalCode,
      street: command.street,
      passwordHash: hashedPassword.value,
    });

    const userResult = await this.commandBus.execute(createUserCommand);

    if (userResult.isErr()) {
      return err(userResult.error);
    }

    const userId = userResult.value;
    const tokens = await this.generateTokens(userId, command.email, "guest");
    return ok(tokens);
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign({
      sub: userId,
      email,
      role,
    });

    const refreshToken = randomUUID();
    const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
    const now = new Date();

    await this.refreshTokenRepo.insert({
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      userId,
      tokenHash,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days
      revokedAt: null,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600,
    };
  }
}
```

**Step 5: Write the BDD spec**

```typescript
// register.spec.ts
import { defineFeature, loadFeature } from "jest-cucumber";
import { RegisterService } from "../register.service";
import { RegisterCommand } from "../register.command";
import { UserAlreadyExistsError } from "@modules/user/domain/user.errors";
import { Result } from "neverthrow";
import { ok, err } from "neverthrow";

const feature = loadFeature(
  "src/modules/auth/commands/register/__tests__/register.feature",
);

defineFeature(feature, (test) => {
  let service: RegisterService;
  let mockCommandBus: { execute: jest.Mock };
  let mockJwtService: { sign: jest.Mock };
  let mockRefreshTokenRepo: { insert: jest.Mock };
  let result: Result<any, UserAlreadyExistsError>;

  beforeEach(() => {
    mockCommandBus = {
      execute: jest.fn().mockResolvedValue(ok("generated-user-id")),
    };
    mockJwtService = {
      sign: jest.fn().mockReturnValue("mock-access-token"),
    };
    mockRefreshTokenRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
    };
    service = new RegisterService(
      mockCommandBus as any,
      mockJwtService as any,
      mockRefreshTokenRepo as any,
    );
  });

  test("Successfully registering a new user", ({ given, when, then }) => {
    given(/^no user with email "(.*)" exists$/, () => {
      // Default mock succeeds
    });

    when(
      /^I execute the register command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const command = new RegisterCommand({
          email,
          password,
          country: "England",
          postalCode: "28566",
          street: "Grand Avenue",
        });
        result = await service.execute(command);
      },
    );

    then("the result is ok with access and refresh tokens", () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value.accessToken).toBeDefined();
        expect(result.value.refreshToken).toBeDefined();
        expect(result.value.expiresIn).toBe(3600);
      }
    });
  });

  test("Failing to register with existing email", ({ given, when, then }) => {
    given(/^a user with email "(.*)" already exists$/, () => {
      mockCommandBus.execute.mockResolvedValue(
        err(new UserAlreadyExistsError()),
      );
    });

    when(
      /^I execute the register command with email "(.*)" and password "(.*)"$/,
      async (email: string, password: string) => {
        const command = new RegisterCommand({
          email,
          password,
          country: "England",
          postalCode: "28566",
          street: "Grand Avenue",
        });
        result = await service.execute(command);
      },
    );

    then("the result is an error of type UserAlreadyExistsError", () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UserAlreadyExistsError);
      }
    });
  });
});
```

**Step 6: Run tests**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/auth/commands/register/__tests__/register.spec.ts -v`
Expected: 2 scenarios PASS

**Step 7: Write the HTTP controller**

```typescript
// register.http.controller.ts
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  ConflictException as ConflictHttpException,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Result } from "neverthrow";
import { ApiErrorResponse } from "@repo/core";
import { routesV1 } from "@config/app.routes";
import { RegisterCommand } from "./register.command";
import { RegisterRequestDto } from "./register.request.dto";
import { AuthTokensResponseDto } from "../../dtos/auth-tokens.response.dto";
import { UserAlreadyExistsError } from "@modules/user/domain/user.errors";
import { AuthTokens } from "./register.service";
import { Public } from "@src/infrastructure/auth/public.decorator";

@Controller(routesV1.version)
export class RegisterHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @ApiOperation({ summary: "Register a new user" })
  @ApiResponse({ status: HttpStatus.CREATED, type: AuthTokensResponseDto })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: UserAlreadyExistsError.message,
    type: ApiErrorResponse,
  })
  @Post(routesV1.auth.register)
  async register(
    @Body() body: RegisterRequestDto,
  ): Promise<AuthTokensResponseDto> {
    const command = new RegisterCommand(body);
    const result: Result<AuthTokens, UserAlreadyExistsError> =
      await this.commandBus.execute(command);

    return result.match(
      (tokens) => ({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      }),
      (error) => {
        if (error instanceof UserAlreadyExistsError) {
          throw new ConflictHttpException(error.message);
        }
        throw error;
      },
    );
  }
}
```

**Step 8: Write the response DTO**

```typescript
// dtos/auth-tokens.response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class AuthTokensResponseDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIs..." })
  accessToken: string;

  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  refreshToken: string;

  @ApiProperty({ example: 3600, description: "Token expiry in seconds" })
  expiresIn: number;
}
```

**Step 9: Commit**

```bash
git add apps/api/src/modules/auth/commands/register/ apps/api/src/modules/auth/dtos/
git commit -m "feat(auth): add register command with BDD tests"
```

---

### Task 5.10: Login command (BDD test + implementation)

**Files:**

- Create: `apps/api/src/modules/auth/commands/login/login.command.ts`
- Create: `apps/api/src/modules/auth/commands/login/login.service.ts`
- Create: `apps/api/src/modules/auth/commands/login/login.request.dto.ts`
- Create: `apps/api/src/modules/auth/commands/login/login.http.controller.ts`
- Create: `apps/api/src/modules/auth/commands/login/__tests__/login.feature`
- Create: `apps/api/src/modules/auth/commands/login/__tests__/login.spec.ts`

Follow the exact same TDD pattern as Task 5.9. Key differences:

**Login service logic:**

1. Find user by email via `UserRepositoryPort.findOneByEmail()`
2. Verify password via `HashedPassword.fromHash(user.passwordHash).verify(plainPassword)`
3. If invalid → `err(new InvalidCredentialsError())`
4. If valid → generate tokens (same as register)

**Feature file:**

```gherkin
Feature: Login (auth command handler)

  Scenario: Successfully logging in
    Given a user with email "john@test.com" exists with a valid password
    When I execute the login command with email "john@test.com" and password "SecureP@ss1"
    Then the result is ok with access and refresh tokens

  Scenario: Failing to login with wrong password
    Given a user with email "john@test.com" exists with a valid password
    When I execute the login command with email "john@test.com" and password "WrongPassword"
    Then the result is an error of type InvalidCredentialsError

  Scenario: Failing to login with non-existent email
    Given no user with email "unknown@test.com" exists
    When I execute the login command with email "unknown@test.com" and password "AnyPassword1"
    Then the result is an error of type InvalidCredentialsError
```

**Commit message:** `feat(auth): add login command with BDD tests`

---

### Task 5.11: Refresh token command

**Files:**

- Create: `apps/api/src/modules/auth/commands/refresh-token/refresh-token.command.ts`
- Create: `apps/api/src/modules/auth/commands/refresh-token/refresh-token.service.ts`
- Create: `apps/api/src/modules/auth/commands/refresh-token/refresh-token.http.controller.ts`
- Create: `apps/api/src/modules/auth/commands/refresh-token/refresh-token.request.dto.ts`
- Create: `apps/api/src/modules/auth/commands/refresh-token/__tests__/refresh-token.feature`
- Create: `apps/api/src/modules/auth/commands/refresh-token/__tests__/refresh-token.spec.ts`

**Service logic:**

1. Hash the incoming refresh token to look up in DB
2. Find by tokenHash — if not found or expired → `err(TokenInvalidError)`
3. Revoke the old refresh token
4. Generate new access + refresh tokens
5. Return new tokens

**Commit message:** `feat(auth): add refresh token command with BDD tests`

---

### Task 5.12: Logout command

**Files:**

- Create: `apps/api/src/modules/auth/commands/logout/logout.command.ts`
- Create: `apps/api/src/modules/auth/commands/logout/logout.service.ts`
- Create: `apps/api/src/modules/auth/commands/logout/logout.http.controller.ts`

**Service logic:**

1. Revoke all refresh tokens for the user (`revokeByUserId`)
2. Return `ok(undefined)`

**Commit message:** `feat(auth): add logout command`

---

### Task 5.13: Auth module wiring and global RBAC guard

**Files:**

- Create: `apps/api/src/modules/auth/auth.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/infrastructure/auth/auth.module.ts` (update JWT config)

**Step 1: Create the auth domain module**

```typescript
// modules/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { RegisterHttpController } from "./commands/register/register.http.controller";
import { LoginHttpController } from "./commands/login/login.http.controller";
import { RefreshTokenHttpController } from "./commands/refresh-token/refresh-token.http.controller";
import { LogoutHttpController } from "./commands/logout/logout.http.controller";
import { RegisterService } from "./commands/register/register.service";
import { LoginService } from "./commands/login/login.service";
import { RefreshTokenService } from "./commands/refresh-token/refresh-token.service";
import { LogoutService } from "./commands/logout/logout.service";
import { RefreshTokenRepository } from "./database/refresh-token.repository";
import { REFRESH_TOKEN_REPOSITORY } from "./auth.di-tokens";
import { RolesGuard } from "@src/infrastructure/auth/roles.guard";

const httpControllers = [
  RegisterHttpController,
  LoginHttpController,
  RefreshTokenHttpController,
  LogoutHttpController,
];

const commandHandlers = [
  RegisterService,
  LoginService,
  RefreshTokenService,
  LogoutService,
];

const repositories = [
  { provide: REFRESH_TOKEN_REPOSITORY, useClass: RefreshTokenRepository },
];

@Module({
  imports: [CqrsModule],
  controllers: [...httpControllers],
  providers: [...commandHandlers, ...repositories],
})
export class AuthDomainModule {}
```

**Step 2: Add global guards to AppModule**

In `app.module.ts`, add global JWT and Roles guards:

```typescript
// Add to providers array:
{
  provide: APP_GUARD,
  useClass: AuthGuard('jwt'),
},
{
  provide: APP_GUARD,
  useClass: RolesGuard,
},
```

**Step 3: Add `@Public()` decorator to existing endpoints that should be public**

Mark these existing endpoints with `@Public()`:

- `CreateUserHttpController.create()` (or remove if register replaces it)
- `FindUsersHttpController.findUsers()` (for now, until you decide on auth requirements)
- Health check endpoint (already public via its own module)

**Step 4: Run all tests**

Run: `cd apps/api && pnpm test`
Expected: All tests pass. BDD tests use mocked dependencies so guards don't affect them.

**Step 5: Commit**

```bash
git add apps/api/src/modules/auth/ apps/api/src/app.module.ts apps/api/src/infrastructure/auth/
git commit -m "feat(auth): wire auth module with global RBAC guards"
```

---

### Task 5.14: Update CreateUserCommand to accept passwordHash

**Files:**

- Modify: `apps/api/src/modules/user/commands/create-user/create-user.command.ts`
- Modify: `apps/api/src/modules/user/commands/create-user/create-user.service.ts`
- Modify: `apps/api/src/modules/user/commands/create-user/create-user.request.dto.ts`
- Update existing BDD tests for create-user

The CreateUserCommand needs `passwordHash` as a new field. The existing HTTP controller for direct user creation should be updated or marked as admin-only (since normal registration goes through auth/register).

**Commit message:** `feat(auth): update CreateUserCommand to include passwordHash`

---

### Task 5.15: Run full test suite and architecture validation

**Step 1: Run unit tests**

Run: `cd apps/api && pnpm test`
Expected: All pass

**Step 2: Run architecture validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: 0 violations

**Step 3: Run typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Commit any fixes**

```bash
git commit -m "fix(auth): resolve test and architecture issues from Phase 5"
```

---

## Phase 6: Resilience & Advanced Error Handling

### Task 6.1: Migration V6 — idempotency_keys and failed_events tables

**Files:**

- Create: `apps/api/database/migrations/V6__resilience.sql`

**Step 1: Write the migration**

```sql
CREATE TABLE "idempotency_keys" (
  "key" character varying NOT NULL,
  "responseStatus" integer NOT NULL,
  "responseBody" jsonb,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
  CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("key")
);
CREATE INDEX "IDX_idempotency_expiresAt" ON "idempotency_keys" ("expiresAt");

CREATE TABLE "failed_events" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "eventName" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "error" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "maxAttempts" integer NOT NULL DEFAULT 5,
  "nextRetryAt" TIMESTAMP WITH TIME ZONE,
  "status" character varying NOT NULL DEFAULT 'pending_retry',
  CONSTRAINT "PK_failed_events" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_failed_events_status" ON "failed_events" ("status", "nextRetryAt");
```

**Commit message:** `feat(resilience): add V6 migration for idempotency and failed events`

---

### Task 6.2: Retryable decorator in @repo/core

**Files:**

- Create: `packages/core/src/decorators/retryable.decorator.ts`
- Create: `packages/core/src/decorators/__tests__/retryable.decorator.spec.ts`
- Modify: `packages/core/src/decorators/index.ts` (export new decorator)

**Test first:** Write a test class with a `@Retryable` decorated method that fails N times then succeeds. Verify it retries the correct number of times with backoff.

**Implementation:** Method decorator that wraps the original method in a retry loop with exponential backoff and optional jitter. Only retries on errors that are NOT instances of `ExceptionBase` (business errors).

**Commit message:** `feat(resilience): add @Retryable decorator to @repo/core`

---

### Task 6.3: Idempotency interceptor in @repo/infra

**Files:**

- Create: `packages/infra/src/idempotency/idempotency.module.ts`
- Create: `packages/infra/src/idempotency/idempotency.interceptor.ts`
- Create: `packages/infra/src/idempotency/idempotency.repository.ts`
- Create: `packages/infra/src/idempotency/idempotency.schema.ts`
- Create: `packages/infra/src/idempotency/index.ts`
- Create: `packages/infra/src/idempotency/__tests__/idempotency.interceptor.spec.ts`
- Modify: `packages/infra/src/index.ts` (export)

**Logic:**

1. Interceptor reads `Idempotency-Key` header on POST/PUT requests
2. If key exists in DB and not expired → return cached response immediately
3. If not → execute request, store response + key, return response
4. No header → pass through normally

**Commit message:** `feat(resilience): add idempotency interceptor to @repo/infra`

---

### Task 6.4: Circuit breaker in @repo/infra

**Files:**

- Create: `packages/infra/src/circuit-breaker/circuit-breaker.module.ts`
- Create: `packages/infra/src/circuit-breaker/circuit-breaker.service.ts`
- Create: `packages/infra/src/circuit-breaker/circuit-breaker.decorator.ts`
- Create: `packages/infra/src/circuit-breaker/index.ts`
- Create: `packages/infra/src/circuit-breaker/__tests__/circuit-breaker.service.spec.ts`
- Modify: `packages/infra/src/index.ts`

**Step 1: Install opossum**

Run: `cd packages/infra && pnpm add opossum && pnpm add -D @types/opossum`

**Implementation:** Wraps `opossum` circuit breaker. The service manages named circuits. The decorator auto-wraps methods.

**Commit message:** `feat(resilience): add circuit breaker to @repo/infra`

---

### Task 6.5: Dead letter service in @repo/infra

**Files:**

- Create: `packages/infra/src/dead-letter/dead-letter.module.ts`
- Create: `packages/infra/src/dead-letter/dead-letter.repository.ts`
- Create: `packages/infra/src/dead-letter/dead-letter.service.ts`
- Create: `packages/infra/src/dead-letter/dead-letter.schema.ts`
- Create: `packages/infra/src/dead-letter/index.ts`
- Create: `packages/infra/src/dead-letter/__tests__/dead-letter.service.spec.ts`
- Modify: `packages/infra/src/index.ts`

**Logic:** When domain event handlers throw, the error is caught and the event + error details are written to `failed_events` table. A service provides `retryFailedEvents()` for scheduled retry.

**Commit message:** `feat(resilience): add dead letter queue for failed domain events`

---

### Task 6.6: Phase 6 integration — wire resilience modules

**Files:**

- Modify: `apps/api/src/app.module.ts` — import IdempotencyModule, DeadLetterModule
- Modify: `packages/infra/src/index.ts` — export all new modules

**Run full test suite + architecture validation after wiring.**

**Commit message:** `feat(resilience): wire Phase 6 resilience modules into app`

---

## Phase 7: Async/Jobs & Messaging

### Task 7.1: Add Redis to Docker and install dependencies

**Files:**

- Modify: `apps/api/docker/docker-compose.yml` — add Redis service
- Modify: `apps/api/docker/docker-compose.test.yml` — add Redis service
- Modify: `apps/api/package.json` — add @nestjs/bullmq, @nestjs/schedule, bullmq, ioredis
- Modify: `packages/infra/package.json` — add ioredis, @nestjs/schedule

**Step 1: Add Redis to docker-compose.yml**

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 3
```

**Step 2: Install dependencies**

Run: `cd apps/api && pnpm add @nestjs/bullmq bullmq @nestjs/schedule ioredis`
Run: `cd packages/infra && pnpm add ioredis @nestjs/bullmq bullmq @nestjs/schedule`

**Step 3: Add Redis env vars to .env.example and .env.test**

**Commit message:** `feat(async): add Redis infrastructure and queue dependencies`

---

### Task 7.2: Queue module in @repo/infra

**Files:**

- Create: `packages/infra/src/queue/queue.module.ts`
- Create: `packages/infra/src/queue/queue.port.ts`
- Create: `packages/infra/src/queue/bullmq.adapter.ts`
- Create: `packages/infra/src/queue/index.ts`
- Create: `packages/infra/src/queue/__tests__/queue.module.spec.ts`

**Implementation:** Port/adapter for BullMQ. `QueuePort` interface with `enqueue()` and `schedule()`. Module uses `forRoot()` pattern with Redis connection options.

**Commit message:** `feat(async): add queue module with BullMQ adapter`

---

### Task 7.3: Scheduler module in @repo/infra

**Files:**

- Create: `packages/infra/src/scheduler/scheduler.module.ts`
- Create: `packages/infra/src/scheduler/cleanup.scheduler.ts`
- Create: `packages/infra/src/scheduler/index.ts`

**Built-in scheduled jobs:**

- `CleanupExpiredRefreshTokens` — `@Cron('0 3 * * *')` daily at 3am
- `CleanupExpiredIdempotencyKeys` — `@Cron('0 * * * *')` hourly
- `RetryFailedEvents` — `@Cron('*/5 * * * *')` every 5 min

Each job injects the relevant repository/service and calls the cleanup method.

**Commit message:** `feat(async): add scheduler module with cleanup jobs`

---

### Task 7.4: Migration V7 — outbox table

**Files:**

- Create: `apps/api/database/migrations/V7__outbox.sql`

```sql
CREATE TABLE "outbox" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "eventName" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "publishedAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_outbox" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_outbox_unpublished" ON "outbox" ("createdAt") WHERE "publishedAt" IS NULL;
```

**Commit message:** `feat(async): add V7 migration for outbox table`

---

### Task 7.5: Outbox pattern in @repo/infra

**Files:**

- Create: `packages/infra/src/outbox/outbox.module.ts`
- Create: `packages/infra/src/outbox/outbox.repository.ts`
- Create: `packages/infra/src/outbox/outbox.publisher.ts`
- Create: `packages/infra/src/outbox/outbox.schema.ts`
- Create: `packages/infra/src/outbox/index.ts`
- Create: `packages/infra/src/outbox/__tests__/outbox.publisher.spec.ts`

**Logic:**

- `OutboxRepository.insertEvent(eventName, payload)` — writes to outbox table
- `OutboxPublisher` — scheduled job that polls unpublished events, publishes via EventEmitter2, marks as published
- Consider: Modify `SqlRepositoryBase.writeQuery()` to optionally write to outbox in same transaction (future enhancement, document but don't implement in base class to avoid breaking changes)

**Commit message:** `feat(async): add outbox pattern for guaranteed event delivery`

---

### Task 7.6: Event bus abstraction in @repo/infra

**Files:**

- Create: `packages/infra/src/event-bus/event-bus.port.ts`
- Create: `packages/infra/src/event-bus/in-memory.adapter.ts`
- Create: `packages/infra/src/event-bus/redis-pubsub.adapter.ts`
- Create: `packages/infra/src/event-bus/event-bus.module.ts`
- Create: `packages/infra/src/event-bus/index.ts`
- Create: `packages/infra/src/event-bus/__tests__/event-bus.spec.ts`

**Port interface:**

```typescript
export interface EventBusPort {
  publish(eventName: string, payload: unknown): Promise<void>;
  subscribe(
    eventName: string,
    handler: (payload: unknown) => Promise<void>,
  ): void;
}
```

**Adapter selection via `EVENT_BUS_DRIVER` env var.** Default: `memory` (wraps EventEmitter2).

**Commit message:** `feat(async): add event bus abstraction with in-memory and Redis adapters`

---

### Task 7.7: Wire Phase 7 into app

**Files:**

- Modify: `apps/api/src/app.module.ts`
- Modify: `packages/infra/src/index.ts`
- Modify: `.env.example`, `.env.test`

**Commit message:** `feat(async): wire Phase 7 async modules into app`

---

## Phase 8: Caching

### Task 8.1: Cache module in @repo/infra

**Files:**

- Create: `packages/infra/src/cache/cache.port.ts`
- Create: `packages/infra/src/cache/memory-cache.adapter.ts`
- Create: `packages/infra/src/cache/redis-cache.adapter.ts`
- Create: `packages/infra/src/cache/cache.module.ts`
- Create: `packages/infra/src/cache/index.ts`
- Create: `packages/infra/src/cache/__tests__/memory-cache.adapter.spec.ts`

**Test first:** Test the memory cache adapter — set, get, delete, invalidatePattern, TTL expiry.

**Port:**

```typescript
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}
export const CACHE_PORT = Symbol("CACHE_PORT");
```

**Commit message:** `feat(cache): add cache module with memory and Redis adapters`

---

### Task 8.2: @Cacheable decorator

**Files:**

- Create: `packages/infra/src/cache/cacheable.decorator.ts`
- Create: `packages/infra/src/cache/__tests__/cacheable.decorator.spec.ts`

**Logic:** Method decorator that:

1. Builds cache key from template + method arguments
2. Checks cache — if hit, return cached value
3. If miss — execute method, store result in cache, return

**Commit message:** `feat(cache): add @Cacheable decorator`

---

### Task 8.3: HTTP cache interceptor

**Files:**

- Create: `packages/infra/src/cache/http-cache.interceptor.ts`
- Create: `packages/infra/src/cache/__tests__/http-cache.interceptor.spec.ts`

**Logic:** On GET responses, compute ETag (MD5 of response body). Add `ETag` and `Cache-Control` headers. If `If-None-Match` matches → return 304.

**Commit message:** `feat(cache): add HTTP ETag/Cache-Control interceptor`

---

### Task 8.4: Wire cache into app + add cache invalidation handlers

**Files:**

- Modify: `apps/api/src/app.module.ts`
- Modify: `packages/infra/src/index.ts`

**Commit message:** `feat(cache): wire Phase 8 caching into app`

---

## Phase 9: Config, Feature Flags, Soft Deletes & Audit

### Task 9.1: Env config validation with Zod

**Files:**

- Create: `apps/api/src/configs/env.schema.ts`
- Create: `apps/api/src/configs/env.config.ts`
- Modify: `apps/api/src/main.ts` — validate env on bootstrap

**Step 1: Write the Zod schema**

```typescript
// env.schema.ts
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().default(5432),
  DB_USERNAME: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CORS_ORIGINS: z.string().default(""),
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  LOG_PRETTY: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),
  REDIS_PASSWORD: z.string().default(""),
  CACHE_DRIVER: z.enum(["memory", "redis"]).default("memory"),
  CACHE_DEFAULT_TTL: z.coerce.number().default(300),
  EVENT_BUS_DRIVER: z.enum(["memory", "redis"]).default("memory"),
});

export type EnvConfig = z.infer<typeof envSchema>;
```

**Step 2: Validate in main.ts**

```typescript
// At top of bootstrap():
const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  console.error("Invalid environment configuration:", envResult.error.format());
  process.exit(1);
}
```

**Commit message:** `feat(config): add Zod-based env validation with fail-fast on bootstrap`

---

### Task 9.2: Feature flags in @repo/infra

**Files:**

- Create: `packages/infra/src/feature-flags/feature-flag.module.ts`
- Create: `packages/infra/src/feature-flags/feature-flag.service.ts`
- Create: `packages/infra/src/feature-flags/feature-flag.guard.ts`
- Create: `packages/infra/src/feature-flags/feature-flag.decorator.ts`
- Create: `packages/infra/src/feature-flags/index.ts`
- Create: `packages/infra/src/feature-flags/__tests__/feature-flag.service.spec.ts`

**Logic:**

- `FeatureFlagService.isEnabled(flagName)` — reads `FEATURE_${flagName}` from env, returns boolean
- `@FeatureFlag('FLAG_NAME')` — method decorator that applies `FeatureFlagGuard`
- Guard returns 404 (NotFoundException) if flag is disabled — endpoint "doesn't exist"

**Commit message:** `feat(config): add feature flag module`

---

### Task 9.3: Migration V8 — soft deletes and audit_logs

**Files:**

- Create: `apps/api/database/migrations/V8__soft_deletes_and_audit.sql`

```sql
ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "wallets" ADD COLUMN "deletedAt" TIMESTAMP WITH TIME ZONE;

CREATE TABLE "audit_logs" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying,
  "action" character varying NOT NULL,
  "entityType" character varying NOT NULL,
  "entityId" character varying NOT NULL,
  "changes" jsonb,
  "metadata" jsonb,
  CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
);
CREATE INDEX "IDX_audit_logs_entity" ON "audit_logs" ("entityType", "entityId");
CREATE INDEX "IDX_audit_logs_userId" ON "audit_logs" ("userId");
```

**Commit message:** `feat(audit): add V8 migration for soft deletes and audit_logs`

---

### Task 9.4: Soft delete support in @repo/core SqlRepositoryBase

**Files:**

- Modify: `packages/core/src/db/sql-repository.base.ts`
- Create: `packages/core/src/db/__tests__/soft-delete.spec.ts`

**Changes to SqlRepositoryBase:**

1. Add `protected softDeleteEnabled = false` — subclasses opt in
2. Modify `findOneById` and `findAll` and `findAllPaginated` to add `WHERE "deletedAt" IS NULL` when `softDeleteEnabled` is true
3. Add `async softDelete(entity)` — sets `deletedAt = NOW()` + publishes events
4. Add `findOneByIdWithDeleted(id)` — ignores soft delete filter
5. Add `findAllWithDeleted()` — ignores soft delete filter

**Test:** Mock-based unit test verifying soft delete SQL is generated correctly.

**Commit message:** `feat(core): add soft delete support to SqlRepositoryBase`

---

### Task 9.5: Audit trail interceptor in @repo/infra

**Files:**

- Create: `packages/infra/src/audit/audit.module.ts`
- Create: `packages/infra/src/audit/audit.interceptor.ts`
- Create: `packages/infra/src/audit/audit.repository.ts`
- Create: `packages/infra/src/audit/audit.schema.ts`
- Create: `packages/infra/src/audit/index.ts`
- Create: `packages/infra/src/audit/__tests__/audit.interceptor.spec.ts`

**Logic:**

- `AuditInterceptor` — NestJS interceptor applied on POST/PUT/PATCH/DELETE
- After handler executes successfully:
  - Extracts userId from request context
  - Determines action type from HTTP method
  - Logs entity type + id from route params or response body
  - Writes audit record to `audit_logs` table

**Commit message:** `feat(audit): add audit trail interceptor`

---

### Task 9.6: Cursor-based pagination in @repo/core

**Files:**

- Create: `packages/core/src/api/cursor-paginated.response.base.ts`
- Create: `packages/core/src/ddd/cursor-query.base.ts`
- Create: `packages/core/src/ddd/__tests__/cursor-query.spec.ts`
- Modify: `packages/core/src/index.ts` (export new types)

**Implementation:**

```typescript
// cursor-query.base.ts
export abstract class CursorPaginatedQueryBase {
  readonly cursor?: string;
  readonly limit: number;
  readonly direction: "forward" | "backward";

  constructor(props: {
    cursor?: string;
    limit?: number;
    direction?: "forward" | "backward";
  }) {
    this.cursor = props.cursor;
    this.limit = props.limit ?? 20;
    this.direction = props.direction ?? "forward";
  }

  decodeCursor(): { id: string; createdAt: Date } | null {
    if (!this.cursor) return null;
    const decoded = Buffer.from(this.cursor, "base64").toString("utf-8");
    const [id, timestamp] = decoded.split("|");
    return { id, createdAt: new Date(timestamp) };
  }

  static encodeCursor(id: string, createdAt: Date): string {
    return Buffer.from(`${id}|${createdAt.toISOString()}`).toString("base64");
  }
}

// cursor-paginated.response.base.ts
export class CursorPaginated<T> {
  readonly data: readonly T[];
  readonly cursor: string | null;
  readonly hasMore: boolean;

  constructor(props: { data: T[]; cursor: string | null; hasMore: boolean }) {
    this.data = props.data;
    this.cursor = props.cursor;
    this.hasMore = props.hasMore;
  }
}
```

**Commit message:** `feat(core): add cursor-based pagination types`

---

### Task 9.7: Wire Phase 9 into app

**Files:**

- Modify: `apps/api/src/app.module.ts`
- Modify: `packages/infra/src/index.ts`
- Modify: `apps/api/src/modules/user/database/user.repository.ts` — enable soft delete
- Modify: `apps/api/src/modules/wallet/database/wallet.repository.ts` — enable soft delete
- Update Zod schemas for user and wallet to include `deletedAt`

**Commit message:** `feat(config): wire Phase 9 modules into app`

---

## Phase 10: Integrations & Developer Experience

### Task 10.1: Migration V9 — webhook tables

**Files:**

- Create: `apps/api/database/migrations/V9__webhooks.sql`

```sql
CREATE TABLE "webhook_subscriptions" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "url" text NOT NULL,
  "secret" character varying NOT NULL,
  "events" text[] NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "failureCount" integer NOT NULL DEFAULT 0,
  "lastFailureAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_webhook_subscriptions" PRIMARY KEY ("id")
);

CREATE TABLE "webhook_deliveries" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "subscriptionId" character varying NOT NULL,
  "eventName" character varying NOT NULL,
  "payload" jsonb NOT NULL,
  "status" character varying NOT NULL DEFAULT 'pending',
  "responseStatus" integer,
  "responseBody" text,
  "attempts" integer NOT NULL DEFAULT 0,
  "nextRetryAt" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "PK_webhook_deliveries" PRIMARY KEY ("id"),
  CONSTRAINT "FK_webhook_deliveries_subscriptionId" FOREIGN KEY ("subscriptionId") REFERENCES "webhook_subscriptions"("id")
);
```

**Commit message:** `feat(webhooks): add V9 migration for webhook tables`

---

### Task 10.2: Webhook module in @repo/infra

**Files:**

- Create: `packages/infra/src/webhooks/webhook.module.ts`
- Create: `packages/infra/src/webhooks/webhook.repository.ts`
- Create: `packages/infra/src/webhooks/webhook.dispatcher.ts`
- Create: `packages/infra/src/webhooks/webhook.signer.ts`
- Create: `packages/infra/src/webhooks/webhook.schema.ts`
- Create: `packages/infra/src/webhooks/index.ts`
- Create: `packages/infra/src/webhooks/__tests__/webhook.signer.spec.ts`
- Create: `packages/infra/src/webhooks/__tests__/webhook.dispatcher.spec.ts`

**Signer:** HMAC-SHA256 of payload body using the subscription's secret. Sets `X-Webhook-Signature` header.

**Dispatcher:** Fetches active subscriptions for a given event name, sends HTTP POST to each URL with signed payload, records delivery result, retries on failure.

**Commit message:** `feat(webhooks): add webhook dispatcher with HMAC signing`

---

### Task 10.3: Storage abstraction in @repo/infra

**Files:**

- Create: `packages/infra/src/storage/storage.port.ts`
- Create: `packages/infra/src/storage/local-storage.adapter.ts`
- Create: `packages/infra/src/storage/s3-storage.adapter.ts`
- Create: `packages/infra/src/storage/storage.module.ts`
- Create: `packages/infra/src/storage/index.ts`
- Create: `packages/infra/src/storage/__tests__/local-storage.adapter.spec.ts`

**Port:**

```typescript
export interface StoragePort {
  upload(file: Buffer, key: string, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}
export const STORAGE_PORT = Symbol("STORAGE_PORT");
```

**Local adapter:** Saves to `./uploads/` directory (gitignored). `getSignedUrl` returns file path.

**S3 adapter:** Uses `@aws-sdk/client-s3`. Only installed as optional dependency.

**Commit message:** `feat(storage): add file storage abstraction with local and S3 adapters`

---

### Task 10.4: Notification abstraction in @repo/infra

**Files:**

- Create: `packages/infra/src/notifications/notification.port.ts`
- Create: `packages/infra/src/notifications/console.adapter.ts`
- Create: `packages/infra/src/notifications/email.adapter.ts`
- Create: `packages/infra/src/notifications/notification.module.ts`
- Create: `packages/infra/src/notifications/index.ts`
- Create: `packages/infra/src/notifications/__tests__/console.adapter.spec.ts`

**Port:**

```typescript
export interface NotificationPort {
  send(notification: {
    channel: "email" | "push" | "in-app";
    recipient: string;
    template: string;
    data: Record<string, unknown>;
  }): Promise<void>;
}
export const NOTIFICATION_PORT = Symbol("NOTIFICATION_PORT");
```

**Console adapter:** Logs notifications to stdout (dev/test).
**Email adapter:** Uses `nodemailer`. Install: `pnpm add nodemailer && pnpm add -D @types/nodemailer`

**Commit message:** `feat(notifications): add notification abstraction with email and console adapters`

---

### Task 10.5: Seed data framework

**Files:**

- Create: `apps/api/src/database/seeds/seed.module.ts`
- Create: `apps/api/src/database/seeds/seed.service.ts`
- Create: `apps/api/src/database/seeds/user.seeder.ts`
- Create: `apps/api/src/database/seeds/wallet.seeder.ts`
- Create: `apps/api/src/database/seeds/seed.cli.ts`

**Logic:**

- `SeedService` orchestrates seeders in order
- Each seeder checks if data exists before inserting (idempotent)
- Uses test factories for consistency
- CLI command: `pnpm seed:up` runs all seeders, `pnpm seed:down` truncates seeded data

**Commit message:** `feat(dx): add seed data framework with CLI commands`

---

### Task 10.6: Wire Phase 10 into app + final integration

**Files:**

- Modify: `apps/api/src/app.module.ts`
- Modify: `packages/infra/src/index.ts`
- Modify: `.env.example` with all new env vars
- Modify: `docker-compose.prod.yml` with Redis

**Steps:**

1. Import all new modules
2. Update .env.example with complete list
3. Run full test suite
4. Run architecture validation
5. Run typecheck

**Commit message:** `feat: wire Phase 10 integrations and complete real-world template`

---

### Task 10.7: Final validation and documentation update

**Step 1: Full test suite**

Run: `cd apps/api && pnpm test`
Expected: All pass

**Step 2: Architecture validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: 0 violations

**Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: No errors

**Step 4: Build**

Run: `pnpm build`
Expected: Success

**Step 5: Update CLAUDE.md**

Add the new modules, commands, env vars, and patterns to CLAUDE.md so future AI sessions know about them.

**Commit message:** `docs: update CLAUDE.md with phases 5-10 patterns and commands`
