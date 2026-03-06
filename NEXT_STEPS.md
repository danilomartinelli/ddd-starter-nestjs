# Next Steps

A phased roadmap for evolving this DDD reference project into a production-grade template. Each phase builds on the previous one.

> **Current state:** The project has a solid DDD/Hexagonal Architecture with CQRS, Turborepo monorepo, NestJS 11, Slonik v48, neverthrow, and Zod v4. What follows are the gaps to close.

---

## Phase 1: Foundation — CI/CD & Developer Experience

Every contributor should get fast, automated feedback. Without CI, quality depends entirely on manual discipline.

### GitHub Actions CI Pipeline

- [x] Workflow on `push` and `pull_request` to `main`
- [x] Matrix: Node 22.x, Ubuntu latest
- [x] Steps: install (`pnpm install --frozen-lockfile`) → lint → build → test → test:e2e (Postgres service container)
- [x] Turbo remote cache for faster CI runs
- [x] `pnpm deps:validate` as a CI step to enforce architectural layer rules

### Pre-commit Hooks

- [x] `husky` + `lint-staged` for Prettier and ESLint on staged files
- [x] `tsc --noEmit` for type checking before commit

### README Enhancements

- [x] CI status badge
- [x] Coverage badge (Codecov)
- [x] Node.js version and license badges

---

## Phase 2: Test Coverage

The project has only 2 e2e tests. Domain logic — the most valuable layer — has zero unit tests. For a DDD reference project, tests _are_ documentation of business rules.

### Domain Layer

- [x] Entity creation via factory methods (valid and invalid props)
- [x] Value Object validation (Email, Address, etc.)
- [x] Domain Event emission on aggregate state changes
- [x] Guard utility edge cases

### Application Layer

- [x] Command handler success and failure paths (mock repositories)
- [x] Query handler tests with mock data
- [x] Domain event propagation after command execution

### Infrastructure Layer

- [x] Repository write/read round-trip tests against test DB
- [x] Pagination query tests
- [x] Mapper tests (entity ↔ persistence model)

### Testing Infrastructure

- [x] Coverage thresholds in Jest (85% core, 80% api)
- [x] Coverage report upload to Codecov in CI
- [x] `packages/testing` workspace with shared factories, builders, fixtures

---

## Phase 3: Security & Production-Readiness

The architecture is solid but missing production essentials. Anyone using this as a template needs these patterns.

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

---

## Phase 4: Observability & Advanced DDD Patterns

Takes the project from "good reference" to "production-grade template" and deepens the DDD patterns.

### Observability

- [ ] **OpenTelemetry** basic setup (traces + metrics)
- [ ] Request tracing with correlation IDs across services
- [ ] Database query performance logging
- [ ] GraphQL operation metrics

### GraphQL Hardening

- [ ] Query complexity analysis and depth limiting
- [ ] Authentication/authorization guards on resolvers
- [ ] Proper error formatting (not raw exceptions)
- [ ] Batch query prevention

### Architecture Enforcement

- [ ] Enable circular dependency detection in dependency-cruiser
- [ ] Cross-module import prevention (communicate only via domain events or public interfaces)
- [ ] Document module boundaries in README

### Advanced DDD Patterns (Examples)

- [ ] **Saga / Process Manager** — multi-aggregate workflow (e.g., user registration → wallet creation → welcome email)
- [ ] **Read Model / Projection** — CQRS read-side with denormalized query table
- [ ] **Domain Service** — cross-entity business logic that doesn't belong in a single aggregate
