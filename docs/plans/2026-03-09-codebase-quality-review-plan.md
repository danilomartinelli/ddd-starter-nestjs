# Codebase Quality Review — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix code smells, inconsistencies, and gaps identified in the post-phase review to bring the codebase to template+production quality.

**Architecture:** Three priority waves (P0→P1→P2). Each wave gets its own commit. TDD where applicable — write/update tests first, then fix.

**Tech Stack:** NestJS, Slonik, Zod, neverthrow, jest-cucumber, class-validator

---

### Task 1: Extract DeleteUserCommand to its own file + extend Command base class

**Files:**

- Create: `apps/api/src/modules/user/commands/delete-user/delete-user.command.ts`
- Modify: `apps/api/src/modules/user/commands/delete-user/delete-user.service.ts`
- Modify: `apps/api/src/modules/user/commands/delete-user/delete-user.http-controller.ts`

**Step 1: Create `delete-user.command.ts`**

```typescript
import { Command, CommandProps } from "@repo/core";

export class DeleteUserCommand extends Command {
  readonly userId: string;

  constructor(props: CommandProps<DeleteUserCommand>) {
    super(props);
    this.userId = props.userId;
  }
}
```

**Step 2: Update `delete-user.service.ts` — remove inline command, import from new file**

Remove the `DeleteUserCommand` class definition (lines 8-14). Update import:

```typescript
import { DeleteUserCommand } from "./delete-user.command";
```

Keep the rest of the service unchanged.

**Step 3: Update `delete-user.http-controller.ts` — change import path**

Change:

```typescript
import { DeleteUserCommand } from "./delete-user.service";
```

To:

```typescript
import { DeleteUserCommand } from "./delete-user.command";
```

**Step 4: Run tests**

Run: `cd apps/api && pnpm test`
Expected: All 220 tests pass. The `DeleteUserCommand` instantiation in the controller (`new DeleteUserCommand({ userId: id })`) will now call `super(props)` from `Command` base class, which adds `correlationId` and `causationId` metadata.

**Step 5: Run deps:validate**

Run: `cd apps/api && pnpm deps:validate`
Expected: 0 violations

---

### Task 2: Fix GET /users — change @Body to @Query

**Files:**

- Modify: `apps/api/src/modules/user/queries/find-users/find-users.http.controller.ts`

**Step 1: Replace @Body with @Query and merge DTOs**

In `find-users.http.controller.ts`, the controller currently takes two separate params (`@Body() request` and `@Query() queryParams`). Since all fields in `FindUsersRequestDto` are already `@IsOptional()`, simply merge into a single `@Query()`:

Change line 23-24 from:

```typescript
  async findUsers(
    @Body() request: FindUsersRequestDto,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<UserPaginatedResponseDto> {
```

To:

```typescript
  async findUsers(
    @Query() request: FindUsersRequestDto,
    @Query() queryParams: PaginatedQueryRequestDto,
  ): Promise<UserPaginatedResponseDto> {
```

Also remove the unused `Body` import from `@nestjs/common` (line 1).

**Step 2: Run tests and build**

Run: `cd apps/api && pnpm test && pnpm build`
Expected: All tests pass, build clean.

---

### Task 3: Remove duplicate wallet.errors.spec.ts

**Files:**

- Delete: `apps/api/src/modules/wallet/domain/wallet.errors.spec.ts`

**Step 1: Delete the inline duplicate**

Delete `apps/api/src/modules/wallet/domain/wallet.errors.spec.ts` (the 3-test version).
Keep `apps/api/src/modules/wallet/domain/__tests__/wallet.errors.spec.ts` (the 9-test version).

**Step 2: Run tests**

Run: `cd apps/api && pnpm test`
Expected: 217 tests pass (3 fewer — the duplicates are gone). All 9 wallet error tests in `__tests__/` still pass.

---

### Task 4: Commit P0 wave

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "refactor: fix structural violations (P0)

- Extract DeleteUserCommand to own file, extend Command base class
- Fix GET /users to use @Query instead of @Body (HTTP semantics)
- Remove duplicate wallet.errors.spec.ts (keep __tests__/ version)"
```

---

### Task 5: Standardize wallet domain error constructors

**Files:**

- Modify: `apps/api/src/modules/wallet/domain/wallet.errors.ts`
- Modify: `apps/api/src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`

**Step 1: Update test to expect `cause` parameter support**

In `apps/api/src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`, add test cases for `cause` parameter to each error class. For each describe block (WalletNotEnoughBalanceError, InsufficientBalanceError, SameWalletTransferError), add:

```typescript
it("accepts optional cause", () => {
  const cause = new Error("underlying cause");
  const error = new WalletNotEnoughBalanceError(cause);
  expect(error.cause).toBe(cause);
});

it("accepts both cause and metadata", () => {
  const cause = new Error("underlying cause");
  const metadata = { walletId: "123" };
  const error = new WalletNotEnoughBalanceError(cause, metadata);
  expect(error.cause).toBe(cause);
  expect(error.metadata).toEqual(metadata);
});
```

(Repeat pattern for each error class with appropriate variable names.)

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`
Expected: FAIL — new tests fail because constructors don't accept `cause`.

**Step 3: Update error constructors**

In `apps/api/src/modules/wallet/domain/wallet.errors.ts`, change all three constructors from:

```typescript
constructor(metadata?: unknown) {
  super(ClassName.message, undefined, metadata);
}
```

To:

```typescript
constructor(cause?: Error, metadata?: unknown) {
  super(ClassName.message, cause, metadata);
}
```

**Step 4: Run tests to verify they pass**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`
Expected: All 15 tests pass (9 existing + 6 new).

---

### Task 6: Move inline test files to `__tests__/` directories

**Files to move:**

| From                                                             | To                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `modules/user/domain/user.entity.spec.ts`                        | `modules/user/domain/__tests__/user.entity.spec.ts`                        |
| `modules/user/domain/user.errors.spec.ts`                        | `modules/user/domain/__tests__/user.errors.spec.ts`                        |
| `modules/user/domain/value-objects/address.value-object.spec.ts` | `modules/user/domain/value-objects/__tests__/address.value-object.spec.ts` |
| `modules/user/database/user.schema.spec.ts`                      | `modules/user/database/__tests__/user.schema.spec.ts`                      |
| `modules/user/user.mapper.spec.ts`                               | `modules/user/__tests__/user.mapper.spec.ts`                               |
| `modules/wallet/domain/wallet.entity.spec.ts`                    | `modules/wallet/domain/__tests__/wallet.entity.spec.ts`                    |
| `modules/wallet/database/wallet.schema.spec.ts`                  | `modules/wallet/database/__tests__/wallet.schema.spec.ts`                  |
| `modules/wallet/wallet.mapper.spec.ts`                           | `modules/wallet/__tests__/wallet.mapper.spec.ts`                           |

**Step 1: Create `__tests__/` directories and move files**

For each file, use `mkdir -p` to ensure `__tests__/` exists, then `git mv` to move.

**Step 2: Update relative imports in moved test files**

Each moved file's relative imports must be updated since they now sit one level deeper. E.g., in `user.entity.spec.ts`:

- `'./user.entity'` → `'../user.entity'`
- `'./value-objects/address.value-object'` → `'../value-objects/address.value-object'`

Similarly for each file — update any relative imports to point one directory up.

**Step 3: Run all tests**

Run: `cd apps/api && pnpm test`
Expected: Same number of tests pass as before (all tests, no duplicates).

---

### Task 7: Implement WalletMapper.toResponse() and create WalletResponseDto

**Files:**

- Create: `apps/api/src/modules/wallet/dtos/wallet.response.dto.ts`
- Modify: `apps/api/src/modules/wallet/wallet.mapper.ts`
- Modify: `apps/api/src/modules/wallet/wallet.mapper.spec.ts` (now at `__tests__/wallet.mapper.spec.ts` after Task 6)

**Step 1: Create WalletResponseDto**

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { ResponseBase } from "@repo/core";

export class WalletResponseDto extends ResponseBase {
  @ApiProperty({
    example: "2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231",
    description: "User ID that owns this wallet",
  })
  userId: string;

  @ApiProperty({
    example: 1000,
    description: "Wallet balance in cents",
  })
  balance: number;
}
```

**Step 2: Update test — replace "throws not implemented" with proper assertion**

In the mapper spec, replace the `toResponse` describe block:

```typescript
describe("toResponse", () => {
  it("maps entity to response DTO with whitelisted properties", () => {
    const entity = new WalletEntity({
      id: "wallet-id",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-02"),
      props: { userId: "user-id", balance: 500 },
    });
    const response = mapper.toResponse(entity);
    expect(response).toBeInstanceOf(WalletResponseDto);
    expect(response.id).toBe("wallet-id");
    expect(response.userId).toBe("user-id");
    expect(response.balance).toBe(500);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/__tests__/wallet.mapper.spec.ts`
Expected: FAIL — `toResponse()` still throws.

**Step 4: Implement toResponse in WalletMapper**

Update `wallet.mapper.ts`:

```typescript
import { Mapper } from "@repo/core";
import { Injectable } from "@nestjs/common";
import { WalletEntity } from "./domain/wallet.entity";
import { WalletModel, walletSchema } from "./database/wallet.schema";
import { WalletResponseDto } from "./dtos/wallet.response.dto";

@Injectable()
export class WalletMapper implements Mapper<
  WalletEntity,
  WalletModel,
  WalletResponseDto
> {
  // ... toPersistence and toDomain unchanged ...

  toResponse(entity: WalletEntity): WalletResponseDto {
    const props = entity.getProps();
    const response = new WalletResponseDto(entity);
    response.userId = props.userId;
    response.balance = props.balance;
    return response;
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/__tests__/wallet.mapper.spec.ts`
Expected: PASS

---

### Task 8: Deduplicate user-wallet-summary Zod schema

**Files:**

- Create: `apps/api/src/modules/user/dtos/user-wallet-summary.read-model.ts`
- Modify: `apps/api/src/modules/user/application/projections/user-wallet-summary.projector.ts`
- Modify: `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.query-handler.ts`

**Step 1: Create shared schema file**

```typescript
import { z } from "zod";

export const userWalletSummaryReadSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
  email: z.string().nullable(),
  country: z.string().nullable(),
  walletId: z.string().nullable(),
  balance: z.number().int().nullable(),
});

export type UserWalletSummaryReadModel = z.infer<
  typeof userWalletSummaryReadSchema
>;
```

**Step 2: Update projector to import shared schema**

In `user-wallet-summary.projector.ts`, remove the local `userWalletSummarySchema` definition (lines 9-18). Add import:

```typescript
import { userWalletSummaryReadSchema } from "../../dtos/user-wallet-summary.read-model";
```

Replace all occurrences of `userWalletSummarySchema` with `userWalletSummaryReadSchema`.

**Step 3: Update query handler to import shared schema**

In `find-user-wallet-summary.query-handler.ts`, remove the local schema definition and type alias (lines 7-20). Add import:

```typescript
import {
  userWalletSummaryReadSchema,
  UserWalletSummaryReadModel,
} from "../../dtos/user-wallet-summary.read-model";
```

**Step 4: Update the HTTP controller import**

In `find-user-wallet-summary.http.controller.ts`, update the import of `UserWalletSummaryReadModel` to come from the shared file:

```typescript
import { FindUserWalletSummaryQuery } from "./find-user-wallet-summary.query-handler";
import { UserWalletSummaryReadModel } from "../../dtos/user-wallet-summary.read-model";
```

**Step 5: Run tests and build**

Run: `cd apps/api && pnpm test && pnpm build`
Expected: All tests pass, build clean.

---

### Task 9: Move GraphQL resolver out of graphql-example/ subdirectory

**Files:**

- Move: `apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts` → `apps/api/src/modules/user/commands/create-user/create-user.graphql-resolver.ts`
- Move: `apps/api/src/modules/user/commands/create-user/graphql-example/dtos/` → `apps/api/src/modules/user/commands/create-user/graphql-dtos/`
- Delete: `apps/api/src/modules/user/commands/create-user/graphql-example/` (after moving)
- Modify: `apps/api/src/modules/user/user.module.ts` — update import path

**Step 1: Move files**

```bash
cd apps/api/src/modules/user/commands/create-user
git mv graphql-example/create-user.graphql-resolver.ts create-user.graphql-resolver.ts
git mv graphql-example/dtos graphql-dtos
rmdir graphql-example
```

**Step 2: Update import in graphql resolver**

In the moved `create-user.graphql-resolver.ts`, the import of the command is one level up in graphql-example but same level now:

```typescript
// Was: import { CreateUserCommand } from '../create-user.command';
// Now same directory, no change needed — it was already '../create-user.command'
// Actually it was '../create-user.command' which pointed UP from graphql-example/
// Now it's in the same directory so: './create-user.command'
```

Change:

```typescript
import { CreateUserCommand } from "../create-user.command";
```

To:

```typescript
import { CreateUserCommand } from "./create-user.command";
```

And update DTO imports:

```typescript
import { CreateUserGqlRequestDto } from "./graphql-dtos/create-user.gql-request.dto";
import { IdGqlResponse } from "./graphql-dtos/id.gql-response.dto";
```

Also fix the `@src/modules/user/domain/user.errors` import to use the path alias:

```typescript
import { UserAlreadyExistsError } from "@modules/user/domain/user.errors";
```

**Step 3: Update module import**

In `user.module.ts`, change:

```typescript
import { CreateUserGraphqlResolver } from "./commands/create-user/graphql-example/create-user.graphql-resolver";
```

To:

```typescript
import { CreateUserGraphqlResolver } from "./commands/create-user/create-user.graphql-resolver";
```

**Step 4: Run tests and build**

Run: `cd apps/api && pnpm test && pnpm build`
Expected: All tests pass, build clean.

---

### Task 10: Commit P1 wave

**Step 1: Stage and commit**

```bash
git add -A
git commit -m "refactor: improve pattern consistency (P1)

- Standardize wallet domain error constructors to match user pattern
- Move all inline test files to __tests__/ directories
- Implement WalletMapper.toResponse() with WalletResponseDto
- Deduplicate user-wallet-summary Zod schema to shared file
- Move GraphQL resolver out of graphql-example/ subdirectory"
```

---

### Task 11: Add unit tests for FindUsersQueryHandler

**Files:**

- Create: `apps/api/src/modules/user/queries/find-users/__tests__/find-users.feature`
- Create: `apps/api/src/modules/user/queries/find-users/__tests__/find-users.spec.ts`

**Step 1: Create Gherkin feature file**

```gherkin
Feature: Find users (query handler)

  Scenario: Successfully finding users with filters
    Given users exist in the database
    When I execute the find users query with country "England"
    Then the result is ok with paginated users filtered by country

  Scenario: Returning empty results when no users match
    Given no users exist matching the filter
    When I execute the find users query with country "Atlantis"
    Then the result is ok with an empty paginated list

  Scenario: Pagination works correctly
    Given users exist in the database
    When I execute the find users query with limit 1 and page 1
    Then the result is ok with paginated users respecting the limit
```

**Step 2: Create spec file with mocked pool**

```typescript
import { defineFeature, loadFeature } from "jest-cucumber";
import {
  FindUsersQuery,
  FindUsersQueryHandler,
} from "../find-users.query-handler";

const feature = loadFeature(
  "src/modules/user/queries/find-users/__tests__/find-users.feature",
);

defineFeature(feature, (test) => {
  let handler: FindUsersQueryHandler;
  let mockPool: { query: jest.Mock };
  let result: any;

  const mockUsers = [
    {
      id: "user-1",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      email: "john@test.com",
      country: "England",
      postalCode: "28566",
      street: "Grand Avenue",
      role: "guest",
    },
  ];

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    handler = new FindUsersQueryHandler(mockPool as any);
  });

  test("Successfully finding users with filters", ({ given, when, then }) => {
    given("users exist in the database", () => {
      mockPool.query.mockResolvedValue({
        rows: mockUsers,
        rowCount: 1,
      });
    });

    when(
      /^I execute the find users query with country "(.*)"$/,
      async (country: string) => {
        const query = new FindUsersQuery({
          country,
          limit: 20,
          page: 1,
        });
        result = await handler.execute(query);
      },
    );

    then("the result is ok with paginated users filtered by country", () => {
      expect(result.isOk()).toBe(true);
      const paginated = result._unsafeUnwrap();
      expect(paginated.data).toHaveLength(1);
      expect(paginated.count).toBe(1);
    });
  });

  test("Returning empty results when no users match", ({
    given,
    when,
    then,
  }) => {
    given("no users exist matching the filter", () => {
      mockPool.query.mockResolvedValue({
        rows: [],
        rowCount: 0,
      });
    });

    when(
      /^I execute the find users query with country "(.*)"$/,
      async (country: string) => {
        const query = new FindUsersQuery({
          country,
          limit: 20,
          page: 1,
        });
        result = await handler.execute(query);
      },
    );

    then("the result is ok with an empty paginated list", () => {
      expect(result.isOk()).toBe(true);
      const paginated = result._unsafeUnwrap();
      expect(paginated.data).toHaveLength(0);
      expect(paginated.count).toBe(0);
    });
  });

  test("Pagination works correctly", ({ given, when, then }) => {
    given("users exist in the database", () => {
      mockPool.query.mockResolvedValue({
        rows: [mockUsers[0]],
        rowCount: 1,
      });
    });

    when(
      /^I execute the find users query with limit (\d+) and page (\d+)$/,
      async (limit: string, page: string) => {
        const query = new FindUsersQuery({
          limit: Number(limit),
          page: Number(page),
        });
        result = await handler.execute(query);
      },
    );

    then("the result is ok with paginated users respecting the limit", () => {
      expect(result.isOk()).toBe(true);
      const paginated = result._unsafeUnwrap();
      expect(paginated.limit).toBe(1);
      expect(paginated.page).toBe(1);
    });
  });
});
```

**Step 3: Run test**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/user/queries/find-users/__tests__/find-users.spec.ts`
Expected: PASS — 3 tests

---

### Task 12: Add unit tests for FindUserWalletSummaryQueryHandler

**Files:**

- Create: `apps/api/src/modules/user/queries/find-user-wallet-summary/__tests__/find-user-wallet-summary.feature`
- Create: `apps/api/src/modules/user/queries/find-user-wallet-summary/__tests__/find-user-wallet-summary.spec.ts`

**Step 1: Create Gherkin feature file**

```gherkin
Feature: Find user wallet summary (query handler)

  Scenario: Successfully finding a user wallet summary
    Given a user wallet summary exists for user "user-123"
    When I execute the find user wallet summary query for "user-123"
    Then the result is ok with the wallet summary

  Scenario: Returning null when no summary exists
    Given no user wallet summary exists for user "user-999"
    When I execute the find user wallet summary query for "user-999"
    Then the result is ok with null
```

**Step 2: Create spec file**

```typescript
import { defineFeature, loadFeature } from "jest-cucumber";
import {
  FindUserWalletSummaryQuery,
  FindUserWalletSummaryQueryHandler,
} from "../find-user-wallet-summary.query-handler";

const feature = loadFeature(
  "src/modules/user/queries/find-user-wallet-summary/__tests__/find-user-wallet-summary.feature",
);

defineFeature(feature, (test) => {
  let handler: FindUserWalletSummaryQueryHandler;
  let mockPool: { maybeOne: jest.Mock };
  let result: any;

  const mockSummary = {
    id: "user-123",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    userId: "user-123",
    email: "test@example.com",
    country: "England",
    walletId: "wallet-456",
    balance: 1000,
  };

  beforeEach(() => {
    mockPool = {
      maybeOne: jest.fn(),
    };
    handler = new FindUserWalletSummaryQueryHandler(mockPool as any);
  });

  test("Successfully finding a user wallet summary", ({
    given,
    when,
    then,
  }) => {
    given(
      /^a user wallet summary exists for user "(.*)"$/,
      (userId: string) => {
        mockPool.maybeOne.mockResolvedValue(mockSummary);
      },
    );

    when(
      /^I execute the find user wallet summary query for "(.*)"$/,
      async (userId: string) => {
        const query = new FindUserWalletSummaryQuery({ userId });
        result = await handler.execute(query);
      },
    );

    then("the result is ok with the wallet summary", () => {
      expect(result.isOk()).toBe(true);
      const summary = result._unsafeUnwrap();
      expect(summary).toEqual(mockSummary);
    });
  });

  test("Returning null when no summary exists", ({ given, when, then }) => {
    given(
      /^no user wallet summary exists for user "(.*)"$/,
      (userId: string) => {
        mockPool.maybeOne.mockResolvedValue(null);
      },
    );

    when(
      /^I execute the find user wallet summary query for "(.*)"$/,
      async (userId: string) => {
        const query = new FindUserWalletSummaryQuery({ userId });
        result = await handler.execute(query);
      },
    );

    then("the result is ok with null", () => {
      expect(result.isOk()).toBe(true);
      const summary = result._unsafeUnwrap();
      expect(summary).toBeNull();
    });
  });
});
```

**Step 3: Run test**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/user/queries/find-user-wallet-summary/__tests__/find-user-wallet-summary.spec.ts`
Expected: PASS — 2 tests

---

### Task 13: Document saga event ordering assumptions

**Files:**

- Modify: `apps/api/src/modules/user/application/sagas/saga-event-handlers.ts`

**Step 1: Add documentation comments**

Add a class-level JSDoc comment and an inline comment on the `onWalletCreated` handler:

```typescript
/**
 * Orchestrates the user registration saga by listening to domain events.
 *
 * IMPORTANT — Event ordering assumption:
 * This handler assumes UserCreatedDomainEvent is always processed before
 * WalletCreatedDomainEvent. This holds because:
 * 1. Events are emitted synchronously within the same process via EventEmitter2
 * 2. UserCreatedDomainEvent triggers both saga creation AND wallet creation
 * 3. The saga insert completes before the wallet event handler fires
 *
 * In a distributed system (e.g., message broker), this assumption may break.
 * If migrating to async messaging, consider:
 * - Saga rehydration with retry/backoff on missing saga
 * - Outbox pattern to guarantee event ordering
 * - Dead letter queue for orphaned events
 */
@Injectable()
export class UserRegistrationSagaHandler {
```

On the `onWalletCreated` method, add:

```typescript
// If saga is not found, it means the UserCreatedDomainEvent hasn't been
// processed yet (shouldn't happen with synchronous event emitter).
// See class-level documentation for ordering guarantees.
```

**Step 2: Run build to ensure no syntax issues**

Run: `cd apps/api && pnpm build`
Expected: Build clean.

---

### Task 14: Add comment to CLI parse methods

**Files:**

- Modify: `apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`

**Step 1: Add a single comment block above the first @Option**

Before line 44 (`@Option({`), add:

```typescript
// nest-commander requires @Option parse methods even for pass-through values.
// Validation is handled by class-validator on the CreateUserCommand DTO.
```

No other changes needed — the methods are intentionally trivial.

---

### Task 15: Commit P2 wave

**Step 1: Run full test suite**

Run: `cd apps/api && pnpm test`
Expected: All tests pass (previous count + 5 new query handler tests).

**Step 2: Run build and deps:validate**

Run: `cd apps/api && pnpm build && pnpm deps:validate`
Expected: Clean build, 0 violations.

**Step 3: Stage and commit**

```bash
git add -A
git commit -m "refactor: add coverage, polish, and documentation (P2)

- Add BDD unit tests for FindUsersQueryHandler (3 scenarios)
- Add BDD unit tests for FindUserWalletSummaryQueryHandler (2 scenarios)
- Document saga event ordering assumptions and risks
- Document CLI controller parse method convention"
```

---

### Task 16: Final verification

**Step 1: Run full CI-equivalent check**

```bash
pnpm lint && pnpm build && pnpm test && cd apps/api && pnpm deps:validate
```

Expected: Everything passes. Total test count should be ~222+ (220 original - 3 duplicates + 5 new query tests).
