# Code Review Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Address all 9 code review items from the `feat/dependency-upgrade` branch, improving Slonik safety, type safety, nestjs-slonik design, design doc accuracy, and correlation ID collision resistance.

**Architecture:** Surgical edits across 9 files. No new files. No structural changes. Each task is independent and can be committed separately.

**Tech Stack:** Slonik v48, NestJS v11, TypeScript 5.9, `@standard-schema/spec`

---

### Task 1: Replace sql.unsafe with sql tag in sql-repository.base.ts

**Files:**
- Modify: `packages/core/src/db/sql-repository.base.ts:79` (delete method)
- Modify: `packages/core/src/db/sql-repository.base.ts:178` (generateInsertQuery method)

**Step 1: Replace sql.unsafe in delete() method**

In `packages/core/src/db/sql-repository.base.ts`, change line 79 from:

```typescript
    const query = sql.unsafe`DELETE FROM ${sql.identifier([
```

to:

```typescript
    const query = sql.type(this.schema)`DELETE FROM ${sql.identifier([
```

**Step 2: Replace sql.unsafe in generateInsertQuery() method**

In the same file, change line 178 from:

```typescript
    const query = sql.unsafe`INSERT INTO ${sql.identifier([
```

to:

```typescript
    const query = sql.type(this.schema)`INSERT INTO ${sql.identifier([
```

**Step 3: Remove the dead parsedQuery assignment**

In `generateInsertQuery()`, lines 185-186 are pointless aliasing. Remove:

```typescript
    const parsedQuery = query;
    return parsedQuery;
```

Replace with:

```typescript
    return query;
```

**Step 4: Verify build compiles**

Run: `pnpm turbo build --filter=@repo/core`
Expected: Build succeeds with no type errors

**Step 5: Commit**

```bash
git add packages/core/src/db/sql-repository.base.ts
git commit -m "fix: replace sql.unsafe with sql.type in sql-repository.base"
```

---

### Task 2: Rename shadowing parameter and restore generic typing in writeQuery

**Files:**
- Modify: `packages/core/src/db/sql-repository.base.ts:7-17` (imports)
- Modify: `packages/core/src/db/sql-repository.base.ts:128-150` (writeQuery method)

**Step 1: Add StandardSchemaV1 import**

In `packages/core/src/db/sql-repository.base.ts`, add to the imports at the top of the file:

```typescript
import type { StandardSchemaV1 } from '@standard-schema/spec';
```

**Step 2: Remove unused imports**

After Task 1 removed `sql.unsafe` and Task 2 will make `writeQuery` generic, the `QueryResultRow` import is no longer needed (the return type will use `StandardSchemaV1.InferOutput<T>` instead). Also `PrimitiveValueExpression` is unused. Remove them from the slonik import block. The updated import should be:

```typescript
import {
  DatabasePool,
  DatabaseTransactionConnection,
  IdentifierSqlToken,
  QueryResult,
  QuerySqlToken,
  sql,
  UniqueIntegrityConstraintViolationError,
} from 'slonik';
```

**Step 3: Make writeQuery generic and rename parameter**

Replace the entire `writeQuery` method signature and body (lines 128-150):

From:
```typescript
  protected async writeQuery(
    sql: QuerySqlToken,
    entity: Aggregate | Aggregate[],
  ): Promise<QueryResult<QueryResultRow>> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((entity) => entity.validate());
    const entityIds = entities.map((e) => e.id);

    this.logger.debug(
      `[${RequestContextService.getRequestId()}] writing ${
        entities.length
      } entities to "${this.tableName}" table: ${entityIds}`,
    );

    const result = await this.pool.query(sql);

    await Promise.all(
      entities.map((entity) =>
        entity.publishEvents(this.logger, this.eventEmitter),
      ),
    );
    return result;
  }
```

To:
```typescript
  protected async writeQuery<T extends StandardSchemaV1>(
    query: QuerySqlToken<T>,
    entity: Aggregate | Aggregate[],
  ): Promise<QueryResult<StandardSchemaV1.InferOutput<T>>> {
    const entities = Array.isArray(entity) ? entity : [entity];
    entities.forEach((entity) => entity.validate());
    const entityIds = entities.map((e) => e.id);

    this.logger.debug(
      `[${RequestContextService.getRequestId()}] writing ${
        entities.length
      } entities to "${this.tableName}" table: ${entityIds}`,
    );

    const result = await this.pool.query(query);

    await Promise.all(
      entities.map((entity) =>
        entity.publishEvents(this.logger, this.eventEmitter),
      ),
    );
    return result;
  }
```

Key changes: parameter renamed `sql` → `query`, added generic `<T extends StandardSchemaV1>`, return type uses `StandardSchemaV1.InferOutput<T>`.

**Step 4: Verify build compiles**

Run: `pnpm turbo build --filter=@repo/core && pnpm turbo build --filter=@repo/api`
Expected: Build succeeds. The `UserRepository.updateAddress()` calls `this.writeQuery(statement, user)` where `statement` is `sql.type(userSchema)` — the generic will infer `T` from the Zod schema automatically.

**Step 5: Commit**

```bash
git add packages/core/src/db/sql-repository.base.ts
git commit -m "fix: restore generic typing on writeQuery, rename shadowing parameter"
```

---

### Task 3: Replace SLONIK_TOKEN_SQL construction in seed.ts

**Files:**
- Modify: `apps/api/database/seed.ts:1` (add sql import)
- Modify: `apps/api/database/seed.ts:25` (replace token construction)

**Step 1: Add sql import**

Change line 1 from:

```typescript
import { createPool } from 'slonik';
```

to:

```typescript
import { createPool, sql } from 'slonik';
```

**Step 2: Replace SLONIK_TOKEN_SQL construction**

Replace line 25:

```typescript
    await pool.query({ sql: data, values: [], type: 'SLONIK_TOKEN_SQL' } as any);
```

with:

```typescript
    const rawSql = Object.assign([data], { raw: [data] }) as TemplateStringsArray;
    await pool.query(sql.unsafe(rawSql));
```

**Step 3: Verify build compiles**

Run: `pnpm turbo build --filter=@repo/api`
Expected: Build succeeds with no type errors

**Step 4: Commit**

```bash
git add apps/api/database/seed.ts
git commit -m "fix: use sql.unsafe instead of manual SLONIK_TOKEN_SQL construction in seed script"
```

---

### Task 4: Replace sql.unsafe in e2e test TRUNCATE statements

**Files:**
- Modify: `apps/api/tests/user/create-user/create-user.e2e-spec.ts:31-32`
- Modify: `apps/api/tests/user/delete-user/delete-user.e2e-spec.ts:25-26`

**Step 1: Update create-user e2e spec**

In `apps/api/tests/user/create-user/create-user.e2e-spec.ts`, replace lines 31-32:

```typescript
    await pool.query(sql.unsafe`TRUNCATE "users"`);
    await pool.query(sql.unsafe`TRUNCATE "wallets"`);
```

with:

```typescript
    await pool.query(sql`TRUNCATE "users"`);
    await pool.query(sql`TRUNCATE "wallets"`);
```

**Step 2: Update delete-user e2e spec**

In `apps/api/tests/user/delete-user/delete-user.e2e-spec.ts`, replace lines 25-26:

```typescript
    await pool.query(sql.unsafe`TRUNCATE "users"`);
    await pool.query(sql.unsafe`TRUNCATE "wallets"`);
```

with:

```typescript
    await pool.query(sql`TRUNCATE "users"`);
    await pool.query(sql`TRUNCATE "wallets"`);
```

**Step 3: Verify build compiles**

Run: `pnpm turbo build --filter=@repo/api`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/api/tests/user/create-user/create-user.e2e-spec.ts apps/api/tests/user/delete-user/delete-user.e2e-spec.ts
git commit -m "fix: replace sql.unsafe with sql tag in e2e test TRUNCATE statements"
```

---

### Task 5: Make nestjs-slonik global registration opt-in and tighten types

**Files:**
- Modify: `packages/nestjs-slonik/src/slonik.interfaces.ts` (add isGlobal, tighten types)
- Modify: `packages/nestjs-slonik/src/slonik.module.ts` (use isGlobal, tighten factory args)
- Modify: `apps/api/src/app.module.ts:29-31` (add isGlobal: true)

**Step 1: Update SlonikModuleOptions and SlonikModuleAsyncOptions interfaces**

Replace the entire contents of `packages/nestjs-slonik/src/slonik.interfaces.ts`:

```typescript
import type { ClientConfigurationInput } from 'slonik';
import type { InjectionToken, ModuleMetadata } from '@nestjs/common';

export interface SlonikModuleOptions {
  connectionUri: string;
  clientConfiguration?: ClientConfigurationInput;
  isGlobal?: boolean;
}

export interface SlonikModuleAsyncOptions {
  imports?: ModuleMetadata['imports'];
  useFactory: (
    ...args: unknown[]
  ) => Promise<SlonikModuleOptions> | SlonikModuleOptions;
  inject?: InjectionToken[];
  isGlobal?: boolean;
}
```

**Step 2: Update SlonikModule to use isGlobal and tighten factory args**

Replace the entire contents of `packages/nestjs-slonik/src/slonik.module.ts`:

```typescript
import {
  DynamicModule,
  Module,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { createPool, DatabasePool } from 'slonik';
import { SLONIK_POOL } from './slonik.constants';
import {
  SlonikModuleOptions,
  SlonikModuleAsyncOptions,
} from './slonik.interfaces';

@Module({})
export class SlonikModule implements OnModuleDestroy {
  constructor(
    @Inject(SLONIK_POOL)
    private readonly pool: DatabasePool,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  static forRoot(options: SlonikModuleOptions): DynamicModule {
    return {
      module: SlonikModule,
      global: options.isGlobal ?? false,
      providers: [
        {
          provide: SLONIK_POOL,
          useFactory: async () =>
            createPool(options.connectionUri, options.clientConfiguration),
        },
      ],
      exports: [SLONIK_POOL],
    };
  }

  static forRootAsync(options: SlonikModuleAsyncOptions): DynamicModule {
    return {
      module: SlonikModule,
      global: options.isGlobal ?? false,
      imports: options.imports || [],
      providers: [
        {
          provide: SLONIK_POOL,
          useFactory: async (...args: unknown[]) => {
            const config = await options.useFactory(...args);
            return createPool(
              config.connectionUri,
              config.clientConfiguration,
            );
          },
          inject: options.inject || [],
        },
      ],
      exports: [SLONIK_POOL],
    };
  }
}
```

**Step 3: Add isGlobal: true to app.module.ts**

In `apps/api/src/app.module.ts`, change lines 29-31 from:

```typescript
    SlonikModule.forRoot({
      connectionUri: postgresConnectionUri,
    }),
```

to:

```typescript
    SlonikModule.forRoot({
      connectionUri: postgresConnectionUri,
      isGlobal: true,
    }),
```

**Step 4: Verify build compiles**

Run: `pnpm turbo build --filter=@danilomartinelli/nestjs-slonik && pnpm turbo build --filter=@repo/api`
Expected: Build succeeds with no type errors

**Step 5: Commit**

```bash
git add packages/nestjs-slonik/src/slonik.interfaces.ts packages/nestjs-slonik/src/slonik.module.ts apps/api/src/app.module.ts
git commit -m "fix: make nestjs-slonik global registration opt-in, tighten async option types"
```

---

### Task 6: Fix design doc nanoid reference

**Files:**
- Modify: `docs/plans/2026-03-05-dependency-upgrade-design.md:21` (Decisions section)
- Modify: `docs/plans/2026-03-05-dependency-upgrade-design.md:155` (Layer 5 table)

**Step 1: Update Decisions section**

In `docs/plans/2026-03-05-dependency-upgrade-design.md`, change line 21 from:

```markdown
- **nanoid → uuid:** Use uuid (already a dependency) for ID generation
```

to:

```markdown
- **nanoid → crypto.randomUUID:** Use Node.js built-in `crypto.randomUUID()` for ID generation
```

**Step 2: Update Layer 5 table**

In the same file, change line 155 from:

```markdown
| `nanoid` | 3 | - | Remove, use `uuid` |
```

to:

```markdown
| `nanoid` | 3 | - | Remove, use `crypto.randomUUID()` |
```

**Step 3: Commit**

```bash
git add docs/plans/2026-03-05-dependency-upgrade-design.md
git commit -m "docs: fix design doc to reflect crypto.randomUUID instead of uuid for nanoid replacement"
```

---

### Task 7: Use full UUID for correlation IDs

**Files:**
- Modify: `packages/core/src/application/context/ContextInterceptor.ts:20`
- Modify: `packages/core/src/api/api-error.response.ts:13`

**Step 1: Remove UUID truncation in ContextInterceptor**

In `packages/core/src/application/context/ContextInterceptor.ts`, change line 20 from:

```typescript
    const requestId = request?.body?.requestId ?? randomUUID().slice(0, 6);
```

to:

```typescript
    const requestId = request?.body?.requestId ?? randomUUID();
```

**Step 2: Update API error response example**

In `packages/core/src/api/api-error.response.ts`, change line 13 from:

```typescript
  @ApiProperty({ example: 'YevPQs' })
```

to:

```typescript
  @ApiProperty({ example: '3e7b9a1c-8f2d-4b5e-a6c1-d9f0e8b7a2c4' })
```

**Step 3: Verify build compiles**

Run: `pnpm turbo build --filter=@repo/core`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add packages/core/src/application/context/ContextInterceptor.ts packages/core/src/api/api-error.response.ts
git commit -m "fix: use full UUID for correlation IDs to prevent collision risk"
```

---

### Task 8: Final verification

**Step 1: Full build**

Run: `pnpm turbo build`
Expected: All packages build successfully

**Step 2: Run tests**

Run: `pnpm turbo test`
Expected: All tests pass

**Step 3: Verify no remaining sql.unsafe in non-seed production code**

Run: `grep -r "sql.unsafe" packages/ apps/api/src/ --include="*.ts"`
Expected: No matches (sql.unsafe only remains in e2e test files and seed.ts, which are not production code — actually after Task 4, e2e tests no longer use sql.unsafe either; only seed.ts retains it for its legitimate raw SQL use case)
