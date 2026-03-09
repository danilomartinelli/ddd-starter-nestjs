# Real-World Production Template — Design Document

**Date:** 2026-03-09
**Goal:** Transform the DDD Hexagonal project into a complete, reusable template for production APIs
**Scope:** Enterprise-complete, generic backend template
**Approach:** Bottom-up by layer — each phase delivers a usable increment

## Context

The project already has 4 completed phases:

- Phase 1: CI/CD & Developer Experience
- Phase 2: Test Coverage (80%+ threshold)
- Phase 3: Security & Production (Helmet, rate limiting, CORS, JWT infra, GraphQL armor)
- Phase 4: Observability & Advanced DDD (OpenTelemetry, Pino logging, Sagas, Read Models)

What's missing for a real-world production template: authentication endpoints, resilience patterns, async processing, caching, audit trails, and integration abstractions.

---

## Phase 5: Auth & Identity

### Module Structure

```
modules/auth/
├── commands/
│   ├── login/
│   │   ├── login.command.ts
│   │   ├── login.service.ts
│   │   ├── login.http.controller.ts
│   │   └── login.request.dto.ts
│   ├── register/
│   │   ├── register.command.ts
│   │   ├── register.service.ts
│   │   ├── register.http.controller.ts
│   │   └── register.request.dto.ts
│   ├── refresh-token/
│   │   ├── refresh-token.command.ts
│   │   ├── refresh-token.service.ts
│   │   ├── refresh-token.http.controller.ts
│   │   └── refresh-token.request.dto.ts
│   ├── logout/
│   │   ├── logout.command.ts
│   │   ├── logout.service.ts
│   │   └── logout.http.controller.ts
│   ├── forgot-password/
│   │   └── ...
│   └── reset-password/
│       └── ...
├── domain/
│   ├── auth.errors.ts                    # InvalidCredentialsError, TokenExpiredError
│   ├── value-objects/
│   │   ├── hashed-password.value-object.ts  # Wraps argon2 hash
│   │   └── jwt-token-pair.value-object.ts   # Access + Refresh pair
│   └── events/
│       ├── user-logged-in.domain-event.ts
│       └── password-reset-requested.domain-event.ts
├── database/
│   ├── refresh-token.repository.port.ts
│   └── refresh-token.repository.ts       # Slonik, Zod schema
├── dtos/
│   └── auth-tokens.response.dto.ts       # { accessToken, refreshToken, expiresIn }
├── auth.di-tokens.ts
└── auth.module.ts
```

### Architectural Decisions

- **Auth is a domain module**, not just infrastructure — has entities, events, errors
- **User module keeps `password_hash`** as new field in UserProps — auth module interacts via domain events and repository port
- **`HashedPassword` value object** encapsulates argon2 — never exposes raw hash, has `verify(plain)` method
- **Refresh tokens in own table** with `userId`, `token` (hashed), `expiresAt`, `revokedAt` — supports multiple devices
- **Global RBAC** via `APP_GUARD` in AppModule — `JwtAuthGuard` + `RolesGuard` applied everywhere, `@Public()` for opt-out
- **Register dispatches `CreateUserCommand`** from User module via CommandBus — no logic duplication

### Routes

```typescript
routesV1.auth = {
  login: "/auth/login",
  register: "/auth/register",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
};
```

### Migration V5

```sql
ALTER TABLE users ADD COLUMN password_hash TEXT NOT NULL DEFAULT '';

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
```

---

## Phase 6: Resilience & Advanced Error Handling

### 1. Retry with Exponential Backoff (`@repo/core`)

```typescript
@Retryable({ maxAttempts: 3, backoffMs: 200, backoffMultiplier: 2 })
async callExternalService(): Promise<Result<Data, Error>> { ... }
```

- Decorator wrapping method with retry logic
- Only retries on transient errors (network, timeout) — not business errors
- Configurable: max attempts, backoff base, multiplier, jitter
- Structured logging of each attempt

### 2. Idempotency Middleware (`@repo/infra`)

```
packages/infra/src/idempotency/
├── idempotency.module.ts
├── idempotency.interceptor.ts    # Reads Idempotency-Key header
├── idempotency.repository.ts     # Persists key + response
└── idempotency.schema.ts
```

- Global interceptor detects `Idempotency-Key` header on POST/PUT
- Table `idempotency_keys`: `key`, `response_status`, `response_body`, `created_at`, `expires_at`
- If key exists and not expired → returns cached response
- TTL configurable (default: 24h)

### 3. Circuit Breaker (`@repo/infra`)

```
packages/infra/src/circuit-breaker/
├── circuit-breaker.module.ts
├── circuit-breaker.service.ts     # Wraps opossum
└── circuit-breaker.decorator.ts   # @CircuitBreaker(options)
```

- Uses `opossum` as engine
- States: CLOSED → OPEN → HALF_OPEN
- Config: `failureThreshold`, `resetTimeout`, `fallback`
- Health check reports circuit states
- Decorator: `@CircuitBreaker({ name: 'payment-api', timeout: 5000 })`

### 4. Dead Letter / Failed Events (`@repo/infra`)

```
packages/infra/src/dead-letter/
├── dead-letter.module.ts
├── dead-letter.repository.ts
├── dead-letter.service.ts         # Manual/automatic retry
└── dead-letter.schema.ts
```

- Failed domain event handlers → events go to `failed_events` table
- Periodic job retries failed events
- Status: `pending_retry`, `max_retries_exceeded`, `resolved`
- Admin query endpoint to view failed events

### Migration V6

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,
  response_status INT NOT NULL,
  response_body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

CREATE TABLE failed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  error TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending_retry',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_failed_events_status ON failed_events(status, next_retry_at);
```

---

## Phase 7: Async/Jobs & Messaging

### 1. Queue Module (`@repo/infra`)

```
packages/infra/src/queue/
├── queue.module.ts              # BullMQ + Redis config
├── queue.port.ts                # Abstract interface for job dispatch
├── bullmq.adapter.ts            # BullMQ implementation
├── job.decorator.ts             # @JobHandler('queue-name')
└── queue.health-indicator.ts    # Redis + queue health check
```

- Port/adapter pattern: `QueuePort` interface with `enqueue(jobName, data, opts)`, `schedule(jobName, data, cron)`
- Default adapter: BullMQ + Redis via `@nestjs/bullmq`
- Dashboard: Bull Board UI at `/admin/queues` (RBAC admin protected)

### 2. Scheduled Tasks

```
packages/infra/src/scheduler/
├── scheduler.module.ts          # @nestjs/schedule
└── cleanup.scheduler.ts
```

Built-in jobs:

- `CleanupExpiredRefreshTokens` — daily cron
- `CleanupExpiredIdempotencyKeys` — hourly
- `RetryFailedEvents` — every 5 min
- `CleanupSoftDeletedRecords` — weekly (after Phase 9)

### 3. Outbox Pattern

```
packages/infra/src/outbox/
├── outbox.module.ts
├── outbox.repository.ts
├── outbox.publisher.ts          # Poller reads outbox and publishes
└── outbox.schema.ts
```

- `SqlRepositoryBase.writeQuery()` writes domain events to `outbox` table in the **same transaction**
- Publisher poller reads outbox and publishes via EventEmitter / external event bus
- Guarantees **at-least-once delivery** — handlers must be idempotent
- Cleanup job removes published events periodically

### 4. External Event Bus (optional)

```
packages/infra/src/event-bus/
├── event-bus.port.ts            # Interface: publish(event), subscribe(eventName, handler)
├── in-memory.adapter.ts         # Default: NestJS EventEmitter2
├── redis-pubsub.adapter.ts      # Redis Pub/Sub (production)
└── event-bus.module.ts
```

- Adapter via `EVENT_BUS_DRIVER` env: `memory` | `redis`
- Dev: EventEmitter2 (zero config)
- Prod: Redis PubSub for cross-instance communication
- Rabbit/Kafka as future adapters (interface ready)

### Migration V7

```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_outbox_unpublished ON outbox(created_at) WHERE published_at IS NULL;
```

### Docker Redis

```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
```

### Configuration

```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EVENT_BUS_DRIVER=memory
```

---

## Phase 8: Caching

### Components (`@repo/infra`)

```
packages/infra/src/cache/
├── cache.module.ts
├── cache.port.ts                # Interface: get, set, del, invalidatePattern
├── redis-cache.adapter.ts
├── memory-cache.adapter.ts
├── cacheable.decorator.ts       # @Cacheable(ttl, keyTemplate)
├── cache-invalidate.decorator.ts
└── cache.interceptor.ts         # HTTP ETag/Cache-Control
```

### Cache Port

```typescript
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}
```

- Adapter via `CACHE_DRIVER` env: `memory` | `redis`
- Reuses same Redis connection from BullMQ

### Decorator

```typescript
@Cacheable({ ttl: 300, key: 'users:list:{country}:{page}' })
async execute(query: FindUsersQuery) { ... }
```

### Cache Invalidation via Domain Events

Each module has event handlers that clear relevant cache patterns on mutations.

### HTTP Caching

- `CacheInterceptor` adds `ETag` and `Cache-Control` headers on GET responses
- Supports `If-None-Match` → returns 304 Not Modified
- Only on queries (GET), never on commands

### Configuration

```
CACHE_DRIVER=memory
CACHE_DEFAULT_TTL=300
```

---

## Phase 9: Config, Feature Flags, Soft Deletes & Audit

### 1. Config Validation with Zod

```
apps/api/src/configs/
├── env.schema.ts               # Zod schema for all env vars
├── env.config.ts               # Parsed + validated config
└── app.routes.ts               # (existing)
```

- App **fail-fast** on bootstrap if env vars invalid
- Type inferred automatically (`EnvConfig = z.infer<typeof envSchema>`)
- Replaces direct `process.env` access

### 2. Feature Flags

```
packages/infra/src/feature-flags/
├── feature-flag.module.ts
├── feature-flag.service.ts
├── feature-flag.decorator.ts    # @FeatureFlag('name')
└── feature-flag.guard.ts
```

- Simple: flags defined in env vars (`FEATURE_*`) or config
- Guard returns 404 if feature disabled
- Injectable service for business logic checks

### 3. Soft Deletes in `@repo/core`

- `deleted_at TIMESTAMPTZ` nullable column on all tables
- `SqlRepositoryBase` filters `WHERE deleted_at IS NULL` by default
- New methods: `softDelete(entity)`, `findAllWithDeleted()`, `findOneByIdWithDeleted()`

### 4. Audit Trail

```
packages/infra/src/audit/
├── audit.module.ts
├── audit.interceptor.ts
├── audit.repository.ts
└── audit.schema.ts
```

Table `audit_logs`:

- `id`, `user_id`, `action` (CREATE/UPDATE/DELETE), `entity_type`, `entity_id`, `changes` (jsonb diff), `metadata`, `created_at`
- Automatic interceptor on mutations — extracts userId from request context
- Admin query endpoint: `GET /v1/admin/audit-logs`

### 5. Cursor-based Pagination in `@repo/core`

- New `CursorPaginatedQueryBase` and `CursorPaginated<T>` types
- Coexists with offset pagination
- Opaque cursor (base64 of `id + createdAt`)

### Migration V8

```sql
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE wallets ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  changes JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
```

---

## Phase 10: Integrations & Developer Experience

### 1. Webhooks Outgoing

```
packages/infra/src/webhooks/
├── webhook.module.ts
├── webhook.entity.ts
├── webhook.repository.ts
├── webhook.dispatcher.ts        # HTTP POST with retry
├── webhook.signer.ts            # HMAC-SHA256 signing
└── webhook.schema.ts
```

Tables: `webhook_subscriptions`, `webhook_deliveries`

- Domain events trigger webhook dispatch via job queue
- HMAC-SHA256 signature in `X-Webhook-Signature` header
- Auto-disable subscription after N consecutive failures
- Admin endpoints for CRUD

### 2. File Upload Abstraction

```
packages/infra/src/storage/
├── storage.module.ts
├── storage.port.ts              # upload, download, delete, getSignedUrl
├── local-storage.adapter.ts
├── s3-storage.adapter.ts
└── storage.interceptor.ts
```

- Adapter via `STORAGE_DRIVER` env: `local` | `s3`

### 3. Notification Abstraction

```
packages/infra/src/notifications/
├── notification.module.ts
├── notification.port.ts         # send(channel, recipient, template, data)
├── email.adapter.ts             # Nodemailer
├── console.adapter.ts           # Dev/test
└── templates/
```

- Dispatched via job queue (async)
- Dev: console adapter; Prod: SMTP adapter

### 4. Module Scaffold CLI Enhancement

Update existing `.claude/skills/scaffold-module/` to generate complete structure including:

- All layers (domain, commands, queries, database, API)
- BDD test + feature file
- Migration SQL template
- Test factories and builders

### 5. Seed Data Framework

```
apps/api/src/database/seeds/
├── seed.module.ts
├── seed.service.ts
├── user.seeder.ts
├── wallet.seeder.ts
└── seed.cli.ts
```

- Reuses test factories for consistency
- Idempotent: `seed:up` doesn't duplicate
- `seed:down` cleans seeded data

### Migration V9

```sql
CREATE TABLE webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  failure_count INT NOT NULL DEFAULT 0,
  last_failure_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  response_status INT,
  response_body TEXT,
  attempts INT NOT NULL DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Summary

| Phase | Theme                      | New Dependencies                          | Migrations                           |
| ----- | -------------------------- | ----------------------------------------- | ------------------------------------ |
| 5     | Auth & Identity            | argon2                                    | V5 (refresh_tokens, password_hash)   |
| 6     | Resilience                 | opossum                                   | V6 (idempotency_keys, failed_events) |
| 7     | Async/Jobs                 | @nestjs/bullmq, @nestjs/schedule, ioredis | V7 (outbox) + Docker Redis           |
| 8     | Caching                    | (reuses ioredis)                          | None                                 |
| 9     | Config, Soft Delete, Audit | (none new)                                | V8 (deleted_at, audit_logs)          |
| 10    | Integrations & DX          | nodemailer, @aws-sdk/client-s3 (optional) | V9 (webhooks)                        |

Each phase is independently valuable — the template can be used at any checkpoint.
