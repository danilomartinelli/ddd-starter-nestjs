# Phase 4: Observability & Advanced DDD Patterns — Design

**Date:** 2026-03-09
**Status:** Approved
**Scope:** All 4 subsections (Observability, GraphQL Hardening, Architecture Enforcement, Advanced DDD Patterns)

---

## 1. Observability (OpenTelemetry)

### Approach

Direct `@opentelemetry/sdk-node` — no NestJS wrapper library. Auto-instrumentations for HTTP/Express/pg; custom spans via `@opentelemetry/api` in interceptors.

### Bootstrap

- `tracing.ts` called at the top of `main.ts` before NestJS starts
- `NodeSDK` with auto-instrumentations
- OTLP exporter for production, Console exporter for development (based on `OTEL_EXPORTER` env var)
- Service name/version from env or package.json

### Custom Instrumentation

- **TracingInterceptor** — NestJS interceptor creating spans per request (route, method, status, correlation ID)
- **Slonik interceptor** — logs query duration, adds DB spans
- **Apollo Server plugin** — spans per GraphQL operation (name, variables)

### Metrics

| Metric                               | Type      | Labels                |
| ------------------------------------ | --------- | --------------------- |
| `http_request_duration_seconds`      | Histogram | method, route, status |
| `http_requests_total`                | Counter   | method, route, status |
| `db_query_duration_seconds`          | Histogram | query                 |
| `graphql_operation_duration_seconds` | Histogram | operation, type       |

### Correlation ID Integration

- Connect `RequestContextService.requestId` to OTel trace context
- Enrich Pino logs with `traceId` and `spanId` from active span

### Packages

- `@opentelemetry/sdk-node`
- `@opentelemetry/auto-instrumentations-node`
- `@opentelemetry/exporter-trace-otlp-http`
- `@opentelemetry/exporter-metrics-otlp-http`
- `@opentelemetry/sdk-metrics`
- `@opentelemetry/resources`
- `@opentelemetry/semantic-conventions`

### Docker Infrastructure

- **Jaeger** — port 16686 (UI), 4318 (OTLP HTTP)
- **Prometheus** — port 9090, scrapes `/metrics` endpoint
- **Grafana** — port 3000, pre-configured datasources for Jaeger + Prometheus

---

## 2. GraphQL Hardening

### Query Security (graphql-armor)

- Install `@escape.tech/graphql-armor`
- **Max depth:** 10 (env configurable)
- **Max complexity:** 1000 (env configurable)
- **Max aliases:** 15
- **Batch prevention:** max 5 queries per request

### Authentication / Authorization (JWT)

- `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`
- **JwtModule** in AppModule with `JWT_SECRET` from env
- **JwtStrategy** — validates Bearer token
- **GqlAuthGuard** — adapted for GraphQL context
- **RolesGuard** — checks `UserRoles` from JWT payload vs `@Roles()` decorator
- **@Public()** decorator — opt-out from auth
- Global guard on all GraphQL resolvers

### Error Formatting

- Custom Apollo `formatError` plugin:
  - Strips internals in production (stack traces)
  - Adds `correlationId` to extensions
  - Maps domain errors to GraphQL error codes
  - Logs full details server-side via Pino

### File Structure

```
apps/api/src/infrastructure/
├── auth/
│   ├── jwt.strategy.ts
│   ├── gql-auth.guard.ts
│   ├── roles.guard.ts
│   ├── roles.decorator.ts
│   ├── public.decorator.ts
│   └── auth.module.ts
├── graphql/
│   ├── graphql-armor.config.ts
│   └── graphql-error-formatter.plugin.ts
```

---

## 3. Architecture Enforcement

### Circular Dependency Detection

- Add `no-circular` rule to `.dependency-cruiser.js` with `maxDepth: 3`
- `reportOnly: false` — violations fail the build

### Cross-Module Import Prevention

- Explicit rule: `src/modules/<A>/` cannot import from `src/modules/<B>/` except `events/*.domain-event.ts`
- Named rule in dependency-cruiser for clarity

### Documentation

- `docs/architecture/module-boundaries.md`:
  - Each module's public contract
  - Event-based communication flow
  - Module relationship diagram

---

## 4. Advanced DDD Patterns

### 4a. Saga / Process Manager — User Registration

**Current state:** Simple event handler creates wallet on user creation.
**Target:** Proper Saga with state tracking and compensation.

**Flow:**

1. `UserCreatedDomainEvent` → Saga starts (state: `started`)
2. Create wallet → `WalletCreatedDomainEvent` → state: `wallet_created`
3. Mark complete → state: `completed`
4. On failure → compensate (delete/deactivate user)

**Implementation:**

- `UserRegistrationSaga` entity with state machine
- `sagas` table: `sagaId`, `type`, `state`, `payload`, `createdAt`
- `SagaRepositoryPort` + `SagaRepository`
- Event handlers advance saga state

```
modules/user/application/sagas/
├── user-registration.saga.ts
├── user-registration.saga-state.ts
```

### 4b. Read Model / Projection — User Wallet Summary

**Implementation:**

- Migration `V3__user_wallet_summary.sql` — denormalized `user_wallet_summary` table
- **Projector:** `UserWalletSummaryProjector` listens to `UserCreated` + `WalletCreated` events, upserts
- **Query:** `FindUserWalletSummaryQueryHandler` reads projection directly

```
modules/user/
├── queries/find-user-wallet-summary/
│   ├── find-user-wallet-summary.query-handler.ts
│   ├── find-user-wallet-summary.http.controller.ts
│   └── find-user-wallet-summary.request.dto.ts
├── application/projections/
│   └── user-wallet-summary.projector.ts
```

### 4c. Domain Service — Transfer Funds

**Implementation:**

- `TransferFundsService` in `wallet/domain/services/`
- Takes source wallet, target wallet, amount
- Validates: sufficient balance, not same wallet, amount > 0
- Returns `Result<void, InsufficientBalanceError | SameWalletTransferError>`
- Emits `FundsTransferredDomainEvent`

```
modules/wallet/
├── domain/
│   ├── services/transfer-funds.domain-service.ts
│   ├── events/funds-transferred.domain-event.ts
│   └── wallet.errors.ts (new error types)
├── commands/transfer-funds/
│   ├── transfer-funds.command.ts
│   ├── transfer-funds.service.ts
│   ├── transfer-funds.http.controller.ts
│   └── transfer-funds.request.dto.ts
```

---

## Decisions Summary

| Decision              | Choice                                 | Rationale                          |
| --------------------- | -------------------------------------- | ---------------------------------- |
| OTel integration      | Direct SDK                             | More educational, full control     |
| OTel exporters        | OTLP + console fallback                | Production + dev flexibility       |
| GraphQL security      | graphql-armor                          | All-in-one, less custom code       |
| Auth mechanism        | JWT with Guards                        | Standard NestJS pattern            |
| DDD patterns location | Extend User/Wallet                     | More realistic, builds on existing |
| Dev infrastructure    | Full stack (Jaeger+Prometheus+Grafana) | Complete local observability       |
