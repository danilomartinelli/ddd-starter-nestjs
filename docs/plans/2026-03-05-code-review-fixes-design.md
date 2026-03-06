# Code Review Fixes Design — feat/dependency-upgrade

## Goal

Address 9 code review items from the dependency upgrade branch covering Slonik safety, type safety, nestjs-slonik design, design doc accuracy, and correlation ID collision risk.

## Changes

### 1. Remove unnecessary sql.unsafe in sql-repository.base.ts

**Files:** `packages/core/src/db/sql-repository.base.ts`

Replace `sql.unsafe` with the standard `sql` tag in `delete()` (L79) and `generateInsertQuery()` (L178). These queries already use `sql.identifier()` and bound values — `sql.unsafe` adds no value and weakens safety guarantees.

### 2. Rename shadowing parameter in writeQuery

**Files:** `packages/core/src/db/sql-repository.base.ts`

Rename the `sql` parameter in `writeQuery(sql: QuerySqlToken, ...)` to `query` to avoid shadowing the imported `sql` tag from Slonik.

### 3. Restore generic typing on writeQuery

**Files:** `packages/core/src/db/sql-repository.base.ts`

Make `writeQuery` generic using Slonik v48's `StandardSchemaV1` type parameter:

```typescript
protected async writeQuery<T extends StandardSchemaV1>(
  query: QuerySqlToken<T>,
  entity: Aggregate | Aggregate[],
): Promise<QueryResult<StandardSchemaV1.InferOutput<T>>>
```

This preserves schema type information through the call chain, so callers using `sql.type(schema)` get typed results.

### 4. Replace SLONIK_TOKEN_SQL construction in seed.ts

**Files:** `apps/api/database/seed.ts`

Replace the internal token construction `{ sql: data, values: [], type: 'SLONIK_TOKEN_SQL' } as any` with Slonik's supported `sql.unsafe` API using a properly constructed `TemplateStringsArray`:

```typescript
import { sql } from 'slonik';
// ...
const rawSql = Object.assign([data], { raw: [data] }) as TemplateStringsArray;
await pool.query(sql.unsafe(rawSql));
```

### 5. Keep sql.unsafe in e2e test TRUNCATE statements

**Files:** `apps/api/tests/user/create-user/create-user.e2e-spec.ts`, `apps/api/tests/user/delete-user/delete-user.e2e-spec.ts`

The `TRUNCATE` statements in tests are fixed DDL with no interpolation. `sql.unsafe` is acceptable here, but for consistency replace with the standard `sql` tag: `` sql`TRUNCATE "users"` ``.

### 6. Make nestjs-slonik global registration opt-in

**Files:** `packages/nestjs-slonik/src/slonik.module.ts`, `packages/nestjs-slonik/src/slonik.interfaces.ts`

Add `isGlobal?: boolean` to both `SlonikModuleOptions` and `SlonikModuleAsyncOptions`. Default to `false`. Update `forRoot()` and `forRootAsync()` to use `global: options.isGlobal ?? false`.

Update the consuming app's `SlonikModule.forRootAsync()` call in `apps/api/src/configs/database.config.ts` to pass `isGlobal: true` explicitly.

### 7. Tighten nestjs-slonik async options types

**Files:** `packages/nestjs-slonik/src/slonik.interfaces.ts`, `packages/nestjs-slonik/src/slonik.module.ts`

Replace `any[]` types with NestJS's built-in types:

- `imports?: any[]` → `imports?: ModuleMetadata['imports']`
- `inject?: any[]` → `inject?: InjectionToken[]`
- `useFactory: (...args: any[])` → `useFactory: (...args: unknown[])`
- `forRootAsync` factory: `(...args: any[])` → `(...args: unknown[])`

### 8. Fix design doc: nanoid replacement

**Files:** `docs/plans/2026-03-05-dependency-upgrade-design.md`

Update the Decisions section from `nanoid → uuid` to `nanoid → crypto.randomUUID` and update the Layer 5 table entry accordingly.

### 9. Use full UUID for correlation IDs

**Files:** `packages/core/src/application/context/ContextInterceptor.ts`, `packages/core/src/api/api-error.response.ts`

Remove `.slice(0, 6)` from `randomUUID().slice(0, 6)` to use the full 36-character UUID. Update the `@ApiProperty({ example: 'YevPQs' })` in `api-error.response.ts` to use a full UUID example.
