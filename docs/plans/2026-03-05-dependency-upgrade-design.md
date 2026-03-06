# Dependency Upgrade & Migration Design

## Goal

Update all packages across the monorepo, replace deprecated/broken libraries with modern alternatives, and swap slonik-based migrations for Flyway.

## Decisions

- **NestJS:** v9 → v11 (Express v5)
- **Node.js:** 20.1.0 → 22 LTS (Volta pin)
- **TypeScript:** 4.7 → 5.9
- **ESLint:** 8 → 10 (flat config migration)
- **Prettier:** 2 → 3
- **Jest:** 28 → 29 (ts-jest lacks v30 support; revisit when available)
- **Apollo:** Remove `apollo-server-express`/`apollo-server-core`, add `@apollo/server` v5
- **GraphQL:** `@nestjs/graphql` v10 → v13, `@nestjs/apollo` v10 → v13
- **Slonik:** v31 → v48 (keep for queries)
- **nestjs-slonik:** Remove abandoned package, create new public package `@danilomartinelli/nestjs-slonik`
- **Migrations:** Remove `@slonik/migrator`, add Flyway via Docker
- **oxide.ts → neverthrow:** Replace Result/Option types
- **nanoid → crypto.randomUUID:** Use Node.js built-in `crypto.randomUUID()` for ID generation
- **Zod:** v3 → v4
- **class-validator:** 0.13 → 0.15
- **nestjs-console:** Remove (unmaintained, incompatible with NestJS 11)
- **nestjs-request-context:** v2 → v4
- **source-map-support:** Remove (Node 22 has native source maps)

## Strategy: Layered Migration

### Layer 1: Tooling & Node

Update foundational tools first so better error messages and types are available for debugging later layers.

| Package | From | To |
|---------|------|----|
| Node.js (Volta) | 20.1.0 | 22 LTS |
| `typescript` | 4.7 | 5.9 |
| `eslint` | 8 | 10 |
| `@typescript-eslint/eslint-plugin` | 5 | 8 |
| `@typescript-eslint/parser` | 5 | 8 |
| `prettier` | 2 | 3 |
| `jest` | 28 | 29 |
| `ts-jest` | 28 | 29 |
| `@types/node` | 16 | 22 |
| `@types/jest` | 28 | 29 |
| `rimraf` | 3 | 6 |
| `dependency-cruiser` | 12 | 17 |
| `eslint-config-prettier` | 8 | 10 |
| `eslint-plugin-prettier` | 4 | 5 |
| `source-map-support` | 0.5 | Remove |
| `supertest` | 6 | 7 |

Key changes:
- ESLint flat config: `.eslintrc.js` → `eslint.config.mjs`
- Prettier v3: trailing comma default → `all`

### Layer 2: NestJS Framework

| Package | From | To |
|---------|------|----|
| `@nestjs/common` | 9 | 11 |
| `@nestjs/core` | 9 | 11 |
| `@nestjs/cli` | 9 | 11 |
| `@nestjs/schematics` | 9 | 11 |
| `@nestjs/testing` | 9 | 11 |
| `@nestjs/cqrs` | 9 | 11 |
| `@nestjs/event-emitter` | 1 | 3 |
| `@nestjs/swagger` | 6 | 11 |
| `@nestjs/platform-express` | 9 | 11 |
| `@nestjs/microservices` | 9 | 11 |
| `nestjs-request-context` | 2 | 4 |
| `reflect-metadata` | 0.1 | 0.2 |
| `nestjs-console` | 8 | Remove |

Key changes:
- Express v5: route wildcard syntax changes (`*` → `*path`)
- `Reflector.getAllAndMerge` returns object instead of array for single entries
- Remove nestjs-console (replace with standalone app pattern if needed)

### Layer 3: GraphQL & Apollo

| Package | From | To | Action |
|---------|------|----|--------|
| `apollo-server-express` | 3 | - | Remove |
| `apollo-server-core` | 3 | - | Remove |
| `@apollo/server` | - | 5 | Add |
| `@nestjs/graphql` | 10 | 13 | Upgrade |
| `@nestjs/apollo` | 10 | 13 | Upgrade |
| `graphql` | 16.6 | 16.13 | Upgrade |

Key changes:
- Update `GraphQLModule.forRoot()` to use `ApolloDriver` explicitly
- Update any Apollo Server plugins to v5 API

### Layer 4: Database

| Package | From | To | Action |
|---------|------|----|--------|
| `slonik` | 31 | 48 | Upgrade |
| `nestjs-slonik` | 9 | - | Remove, replace with new package |
| `@slonik/migrator` | 0.11 | - | Remove |

#### 4a: New Package — `@danilomartinelli/nestjs-slonik`

Public package at `packages/nestjs-slonik/`:

```
packages/nestjs-slonik/
  src/
    slonik.module.ts       # forRoot + forRootAsync, OnModuleDestroy
    slonik.constants.ts    # Symbol-based injection token
    slonik.interfaces.ts   # SlonikModuleOptions, SlonikModuleAsyncOptions
    slonik.decorators.ts   # @InjectPool()
    index.ts               # Public API
  package.json             # Publishable, peer deps on @nestjs/* + slonik
  tsconfig.json
```

Design:
- `SLONIK_POOL` injection token as Symbol for type safety
- `forRoot(options)` for static config
- `forRootAsync({ useFactory, inject, imports })` for dynamic config from ConfigService
- `@InjectPool()` decorator
- `OnModuleDestroy` lifecycle hook to close pool gracefully
- `clientConfiguration` parameter for interceptors, timeouts, etc.
- Peer dependencies: `@nestjs/common ^11`, `@nestjs/core ^11`, `slonik ^48`

#### 4b: Flyway Migration

Add Flyway service to `apps/api/docker/docker-compose.yml`:

```yaml
flyway:
  image: redgate/flyway
  command: -url=jdbc:postgresql://postgres:5432/ddh -user=user -password=password migrate
  volumes:
    - ../database/migrations:/flyway/sql
  depends_on:
    - postgres
```

Migration file renaming (Flyway convention):
- `2022.10.07T13.49.19.users.sql` → `V1__users.sql`
- `2022.10.07T13.49.54.wallets.sql` → `V2__wallets.sql`

Remove:
- `database/getMigrator.ts`
- All `migration:*` npm scripts from `apps/api/package.json`

### Layer 5: Libraries

| Package | From | To | Action |
|---------|------|----|--------|
| `oxide.ts` | 1 | - | Remove, replace with `neverthrow` |
| `nanoid` | 3 | - | Remove, use `crypto.randomUUID()` |
| `zod` | 3.21 | 4 | Upgrade |
| `class-validator` | 0.13 | 0.15 | Upgrade |
| `uuid` | 9 | 11 | Upgrade (stay CJS-compatible) |
| `dotenv` | 16 | 17 | Upgrade |
| `rxjs` | 7.2 | 7.8 | Upgrade |

Key changes:

**oxide.ts → neverthrow:**
| oxide.ts | neverthrow |
|----------|------------|
| `Ok(value)` | `ok(value)` |
| `Err(error)` | `err(error)` |
| `Result<T, E>` | `Result<T, E>` |
| `Some(value)` | `T \| undefined` or `Result` |
| `None` | `undefined` or `err()` |
| `.unwrap()` | `.value` (after narrowing) |
| `.match({ Ok, Err })` | `.match(onOk, onErr)` |

**Zod v3 → v4:**
- `z.string().email()` → `z.email()`
- `z.string().uuid()` → `z.uuid()`
- Error customization: `message` → `error`
- `z.record()` requires two arguments

**class-validator 0.13 → 0.15:**
- `forbidUnknownValues` defaults to `true` — may need explicit `false` in validation pipes

## Risks

1. **Slonik v31 → v48 (17 major versions):** Largest risk. API changes across the entire query layer. Need careful review of slonik changelog.
2. **nestjs-slonik replacement:** Custom module is straightforward but needs thorough testing.
3. **NestJS v9 → v11:** Express v5 route wildcards may break existing routes.
4. **Zod v4:** Schema API changes affect all repository query schemas.
5. **ESLint flat config:** Complete config rewrite, but purely tooling (no runtime risk).

## Testing Strategy

Each layer must pass `pnpm turbo build` and `pnpm turbo test` before proceeding to the next. E2E tests (`pnpm turbo test:e2e`) run after layers 2, 4, and 5.
