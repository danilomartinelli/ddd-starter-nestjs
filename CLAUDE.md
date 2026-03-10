# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

This is a **pnpm monorepo** with Turbo. Always use `pnpm` (v9.15.4, Node v22.14.0 via Volta).

```bash
pnpm build                # Build all packages (turbo)
pnpm dev                  # Start dev server with watch mode
pnpm lint                 # Lint and autofix (turbo)
pnpm format               # Prettier format
pnpm test                 # Unit tests across all workspaces
pnpm test:e2e             # E2E tests (requires test database)
```

### Running tests from `apps/api`

```bash
cd apps/api
pnpm test                              # All unit tests (*.spec.ts)
npx jest --config .jestrc.json <path>  # Single test file
pnpm test:e2e                          # E2E tests (*.e2e-spec.ts)
```

### Database (Docker required)

```bash
cd apps/api
pnpm docker:test          # Start test PostgreSQL container
pnpm docker:test:down     # Stop test container
pnpm docker:env           # Start dev environment
pnpm seed:up              # Seed development database
```

### Architecture Validation

```bash
cd apps/api
pnpm deps:validate        # Check layer dependency rules via dependency-cruiser
```

## Project Structure

```
apps/api/          # NestJS application (REST + GraphQL + CLI via nest-commander)
packages/core/     # Shared DDD building blocks (@repo/core)
packages/infra/    # Infrastructure modules (@repo/infra)
packages/nestjs-slonik/  # NestJS Slonik PostgreSQL module (@danilomartinelli/nestjs-slonik)
```

### Path Aliases (in apps/api)

- `@src/*` → `src/*`
- `@modules/*` → `src/modules/*`
- `@config/*` → `src/configs/*`
- `@tests/*` → `tests/*`
- `@repo/core` → `packages/core`
- `@repo/infra` → `packages/infra`

## Architecture

This project implements **Domain-Driven Design with Hexagonal Architecture** and **CQRS**.

### Module Structure (Vertical Slicing)

Each domain module in `apps/api/src/modules/` follows this layout:

```
modules/<name>/
├── commands/<action>/
│   ├── <action>.command.ts              # Command object
│   ├── <action>.service.ts              # CommandHandler (application logic)
│   ├── <action>.http.controller.ts      # REST endpoint
│   ├── <action>.graphql-resolver.ts     # GraphQL resolver
│   ├── <action>.cli.controller.ts       # CLI command (nest-commander)
│   ├── <action>.message.controller.ts   # Event-driven endpoint
│   └── <action>.request.dto.ts          # Input validation DTO
├── queries/<action>/
│   ├── <action>.query-handler.ts
│   ├── <action>.http.controller.ts
│   └── <action>.request.dto.ts
├── domain/
│   ├── <name>.entity.ts                 # AggregateRoot with factory method
│   ├── <name>.types.ts                  # Props interfaces and enums
│   ├── <name>.errors.ts                 # Domain-specific error classes
│   ├── value-objects/                   # Value Objects
│   └── events/                          # Domain Events (*-domain-event.ts)
├── database/
│   ├── <name>.repository.port.ts        # Repository interface (port)
│   └── <name>.repository.ts             # Slonik implementation (adapter)
├── dtos/                                # Response DTOs
├── <name>.mapper.ts                     # Entity ↔ Persistence model mapping
├── <name>.di-tokens.ts                  # Dependency injection tokens
└── <name>.module.ts                     # NestJS module
```

### Layer Dependency Rules (enforced by dependency-cruiser)

- **Domain** → cannot depend on Application, API, or Infrastructure layers
- **Infrastructure** → cannot depend on API layer
- **Commands/Queries** → cannot depend on API layer
- Domain depends only on `@repo/core` base classes and its own value objects/events

### Key Patterns

- **Entities** extend `AggregateRoot<Props>` from `@repo/core`, use static `create()` factory methods, emit domain events via `addEvent()`
- **Error handling** uses `neverthrow` (`Result<T, E>`, `ok()`, `err()`) — not thrown exceptions — for expected failures in command handlers
- **Repositories** implement port interfaces; injected via DI tokens (`@Inject(USER_REPOSITORY)`)
- **Database** uses Slonik (PostgreSQL) with Zod schemas for runtime validation of persistence models
- **Cross-module communication** via domain events (e.g., Wallet module listens to `UserCreatedDomainEvent`)
- **Authentication** via JWT (Passport.js) with access/refresh token rotation, argon2 password hashing
- **Soft deletes** supported via `deletedAt` column and `SoftDeletableProps` in `@repo/core`
- **Feature flags** stored in database, checked via `FeatureFlagService.isEnabled()`
- **Audit logging** via `AuditInterceptor` — automatically records mutations
- **Webhooks** dispatched with HMAC-SHA256 signatures and delivery tracking

### `@repo/core` Package

Provides base classes: `AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`, `Command`, `Query`, `SqlRepositoryBase`, `Guard`, `ResponseBase`, `PaginatedResponseDto`, `ExceptionInterceptor`, `ContextInterceptor`, `RequestContextService`, `CursorPaginatedQueryBase`, `CursorPaginatedResponseDto`, `@Retryable()` decorator, soft-delete support via `SoftDeletableProps`.

### `@repo/infra` Package

Reusable infrastructure modules, each using `DynamicModule` with `static forRoot(options?)`:

| Module                 | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `SecurityModule`       | Helmet, CORS, throttling, input sanitization           |
| `LoggingModule`        | Structured logging via pino                            |
| `HealthModule`         | Health checks (DB, app version)                        |
| `IdempotencyModule`    | Idempotency key interceptor                            |
| `CircuitBreakerModule` | Circuit breaker pattern (opossum)                      |
| `DeadLetterModule`     | Failed event recording and retry                       |
| `QueueModule`          | BullMQ job queues (Redis-backed)                       |
| `SchedulerModule`      | Cron-based task scheduling                             |
| `OutboxModule`         | Transactional outbox for reliable event publishing     |
| `EventBusModule`       | In-process event bus abstraction                       |
| `CacheModule`          | Memory/Redis caching, `@Cacheable()` decorator         |
| `FeatureFlagModule`    | Database-backed feature flags                          |
| `AuditModule`          | Audit trail interceptor for mutations                  |
| `WebhookModule`        | Webhook subscriptions, HMAC signing, delivery tracking |
| `StorageModule`        | File storage abstraction (local/S3)                    |
| `NotificationModule`   | Notification abstraction (console/email)               |

### Domain Modules

| Module   | Purpose                                            |
| -------- | -------------------------------------------------- |
| `user`   | User CRUD, address management, saga orchestration  |
| `wallet` | Wallet creation (via domain event), fund transfers |
| `auth`   | Registration, login, JWT refresh token rotation    |

### Environment Variables

See `apps/api/.env.example` for all variables. Key groups:

- `DB_*` — PostgreSQL connection
- `REDIS_*` — Redis for queues and caching
- `JWT_*` — JWT secret and token expiration
- `CACHE_*` — Cache driver (memory/redis) and TTL
- `STORAGE_*` — File storage driver (local/s3) and paths
- `NOTIFICATION_*` — Notification driver (console/email)
- `GQL_*` — GraphQL security limits (depth, complexity, aliases)
- `THROTTLE_*`, `LOG_*`, `CORS_*` — Security and logging

### Seed Data

```bash
cd apps/api
pnpm seed:up              # Seeds users (with hashed passwords) and wallets
```

The seed script (`database/seed.ts`) is idempotent and uses argon2 for password hashing.

## Code Style

- Prettier: single quotes, trailing commas
- ESLint (flat config): `@typescript-eslint/explicit-module-boundary-types: error`, no property setters, no non-null assertions
- `@typescript-eslint/no-explicit-any` is allowed (off)
- TypeScript strict mode enabled

## Critical Rules (always apply)

- **Never throw exceptions for expected failures** — use `neverthrow` Result types (`ok()`, `err()`)
- **Never import across layer boundaries** — domain cannot import from application/infrastructure/API
- **Always use path aliases** — `@modules/*`, `@src/*`, `@repo/core`, `@tests/*`, `@config/*` (never relative `../../..`)
- **Always create entities via static `create()` factory** — never call constructor directly from outside
- **Always emit domain events** in entity `create()` and state-change methods

## AI Guidance

Detailed architectural patterns and conventions are in `.claude/rules/`:

| Rule File                 | Covers                                                              |
| ------------------------- | ------------------------------------------------------------------- |
| `architecture.md`         | Layer boundaries, hexagonal constraints, cross-module communication |
| `domain-layer.md`         | Entity, ValueObject, DomainEvent, error class patterns              |
| `application-layer.md`    | Command/Query handlers, neverthrow Result types, event handlers     |
| `infrastructure-layer.md` | Repository, Zod schemas, mapper, DI tokens                          |
| `api-layer.md`            | Controllers, DTOs, error mapping, module structure                  |
| `testing.md`              | Factories, BDD with jest-cucumber, integration tests                |
| `imports.md`              | Path aliases and import conventions                                 |

Scaffolding: use the `scaffold-module` skill (`.claude/skills/scaffold-module/`) to generate a full module skeleton.
