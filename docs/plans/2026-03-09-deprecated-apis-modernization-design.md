# Deprecated APIs Modernization Design

## Context

Audit of the codebase revealed deprecated API usages in Zod 4 and legacy Node.js import patterns. All other libraries (class-validator, class-transformer, NestJS 11, Slonik 48, neverthrow) are using current APIs.

## Zod 4 Deprecated Patterns

Zod 4 ([migration guide](https://zod.dev/v4/changelog)) deprecated several method-form APIs in favor of top-level functions. These "still exist but will be removed in the next major version."

### Changes

| File                   | Line  | Before                                                | After                          |
| ---------------------- | ----- | ----------------------------------------------------- | ------------------------------ |
| `user.repository.ts`   | 18    | `z.string().uuid()`                                   | `z.uuid()`                     |
| `user.repository.ts`   | 19-20 | `z.preprocess((val: any) => new Date(val), z.date())` | `z.coerce.date()`              |
| `user.repository.ts`   | 21    | `z.string().email()`                                  | `z.email()`                    |
| `user.repository.ts`   | 25    | `z.nativeEnum(UserRoles)`                             | `z.enum(UserRoles)`            |
| `user.repository.ts`   | 28    | `z.TypeOf<typeof userSchema>`                         | `z.infer<typeof userSchema>`   |
| `wallet.repository.ts` | 13-14 | `z.preprocess((val: any) => new Date(val), z.date())` | `z.coerce.date()`              |
| `wallet.repository.ts` | 19    | `z.TypeOf<typeof walletSchema>`                       | `z.infer<typeof walletSchema>` |

Notes:

- `z.uuid()` uses stricter RFC 9562/4122 validation; safe since the project uses `randomUUID()` which produces RFC-compliant v4 UUIDs
- `z.enum()` in Zod 4 was overloaded to accept TypeScript native enums directly
- `z.coerce.date()` replaces the verbose `z.preprocess` callback pattern
- `ZodObject` import in `sql-repository.base.ts` is kept as-is (not deprecated, only generics redesigned)

## Node.js `'crypto'` -> `'node:crypto'`

The `node:` protocol prefix is the modern standard (Node 16+). Without it still works but is considered legacy.

| File                                                          | Line |
| ------------------------------------------------------------- | ---- |
| `apps/api/src/modules/user/domain/user.entity.ts`             | 13   |
| `apps/api/src/modules/wallet/domain/wallet.entity.ts`         | 9    |
| `apps/api/tests/factories/wallet.factory.ts`                  | 2    |
| `packages/core/src/ddd/command.base.ts`                       | 4    |
| `packages/core/src/ddd/domain-event.base.ts`                  | 1    |
| `packages/core/src/application/context/ContextInterceptor.ts` | 8    |
| `packages/infra/src/logging/logging.module.ts`                | 3    |
| `packages/testing/src/factories/index.ts`                     | 1    |

## Documentation Updates

`.claude/rules/infrastructure-layer.md` examples need updating to reflect the new Zod patterns:

- Schema examples: `z.uuid()`, `z.email()`, `z.enum()`, `z.coerce.date()`, `z.infer`
- Remove the "Always use `z.preprocess(...)` for date fields" rule

## Out of Scope

- `sql.unsafe` in tests/seed/health check — legitimate usage, not deprecated
- `z.object()`, `z.string().min().max()`, `z.number().min().max()` — not deprecated
- class-validator/class-transformer — already using current APIs
- NestJS patterns — already current

## Validation

- `pnpm build` — compilation check
- `pnpm test` — unit tests pass
- `pnpm deps:validate` — layer boundary check
