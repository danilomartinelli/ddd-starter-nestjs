# Phase 4: Observability & Advanced DDD Patterns — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add OpenTelemetry observability, GraphQL security hardening, architecture enforcement, and advanced DDD patterns (Saga, Read Model, Domain Service) to the existing DDD reference project.

**Architecture:** Direct `@opentelemetry/sdk-node` bootstrapped before NestJS for auto-instrumentation of HTTP/Express/pg. `@escape.tech/graphql-armor` for GraphQL security. JWT auth via `@nestjs/passport`. Saga pattern, CQRS read model projection, and domain service added to existing User/Wallet modules.

**Tech Stack:** OpenTelemetry SDK, graphql-armor, @nestjs/jwt, @nestjs/passport, passport-jwt, Jaeger, Prometheus, Grafana

**Design doc:** `docs/plans/2026-03-09-phase4-observability-ddd-design.md`

---

## Part A: Observability (OpenTelemetry)

### Task 1: Install OpenTelemetry packages

**Files:**

- Modify: `apps/api/package.json`

**Step 1: Install OTel dependencies**

Run from repo root:

```bash
cd apps/api && pnpm add @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/exporter-metrics-otlp-http @opentelemetry/sdk-metrics @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/api
```

**Step 2: Verify install**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add OpenTelemetry SDK dependencies"
```

---

### Task 2: Create OTel bootstrap file (tracing.ts)

**Files:**

- Create: `apps/api/src/infrastructure/telemetry/tracing.ts`

**Step 1: Write the tracing bootstrap**

```typescript
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  ConsoleSpanExporter,
  ConsoleMetricExporter,
} from "@opentelemetry/sdk-node";

const isOtlp = process.env.OTEL_EXPORTER !== "console";

const traceExporter = isOtlp
  ? new OTLPTraceExporter({
      url:
        process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
        "http://localhost:4318/v1/traces",
    })
  : new ConsoleSpanExporter();

const metricReader = new PeriodicExportingMetricReader({
  exporter: isOtlp
    ? new OTLPMetricExporter({
        url:
          process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
          "http://localhost:4318/v1/metrics",
      })
    : new ConsoleMetricExporter(),
  exportIntervalMillis: 15_000,
});

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "api",
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || "0.0.0",
  }),
  traceExporter,
  metricReader,
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": { enabled: false },
      "@opentelemetry/instrumentation-dns": { enabled: false },
    }),
  ],
});

sdk.start();

process.on("SIGTERM", () => {
  sdk.shutdown().catch(console.error);
});

export { sdk };
```

**Step 2: Verify build**

Run: `cd apps/api && pnpm build`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add apps/api/src/infrastructure/telemetry/tracing.ts
git commit -m "feat(telemetry): add OpenTelemetry SDK bootstrap"
```

---

### Task 3: Integrate OTel with main.ts

**Files:**

- Modify: `apps/api/src/main.ts`

**Step 1: Add tracing import at top of main.ts**

Add as the very first import in `main.ts` (before any NestJS imports):

```typescript
import "./infrastructure/telemetry/tracing";
```

This must be the FIRST import so OTel can patch modules before they're loaded.

**Step 2: Verify app starts**

Run: `cd apps/api && OTEL_EXPORTER=console pnpm dev`
Expected: App starts, console shows OTel trace/metric output

**Step 3: Commit**

```bash
git add apps/api/src/main.ts
git commit -m "feat(telemetry): integrate OTel SDK into app bootstrap"
```

---

### Task 4: Enrich Pino logs with trace context

**Files:**

- Modify: `packages/infra/src/logging/logging.module.ts`

**Step 1: Add pino-opentelemetry-transport or manual mixin**

Update `LoggingModule.forRoot()` to add a `mixin` that attaches `traceId` and `spanId` from the active OTel span:

```typescript
import { DynamicModule, Module } from "@nestjs/common";
import { LoggerModule } from "nestjs-pino";
import { randomUUID } from "node:crypto";
import { LoggingOptions } from "./logging.types";
import { trace, context } from "@opentelemetry/api";

@Module({})
export class LoggingModule {
  static forRoot(options?: LoggingOptions): DynamicModule {
    return {
      module: LoggingModule,
      imports: [
        LoggerModule.forRoot({
          pinoHttp: {
            level: options?.level ?? "info",
            genReqId: (req: any) => req.headers["x-request-id"] ?? randomUUID(),
            transport: options?.prettyPrint
              ? { target: "pino-pretty", options: { colorize: true } }
              : undefined,
            mixin() {
              const span = trace.getSpan(context.active());
              if (!span) return {};
              const spanContext = span.spanContext();
              return {
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
              };
            },
          },
        }),
      ],
    };
  }
}
```

Note: `@opentelemetry/api` must be added to `packages/infra/package.json` as a dependency:

```bash
cd packages/infra && pnpm add @opentelemetry/api
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add packages/infra/src/logging/logging.module.ts packages/infra/package.json pnpm-lock.yaml
git commit -m "feat(logging): enrich Pino logs with OTel traceId and spanId"
```

---

### Task 5: Add Docker observability infrastructure

**Files:**

- Create: `apps/api/docker/docker-compose.observability.yml`
- Create: `apps/api/docker/prometheus/prometheus.yml`
- Create: `apps/api/docker/grafana/provisioning/datasources/datasources.yml`

**Step 1: Create Prometheus config**

Create `apps/api/docker/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "api"
    metrics_path: "/metrics"
    static_configs:
      - targets: ["host.docker.internal:3000"]
```

**Step 2: Create Grafana datasource provisioning**

Create `apps/api/docker/grafana/provisioning/datasources/datasources.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    isDefault: false

  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
```

**Step 3: Create observability docker-compose**

Create `apps/api/docker/docker-compose.observability.yml`:

```yaml
services:
  jaeger:
    image: jaegertracing/all-in-one:1.62
    ports:
      - "16686:16686" # UI
      - "4317:4317" # OTLP gRPC
      - "4318:4318" # OTLP HTTP
    environment:
      COLLECTOR_OTLP_ENABLED: "true"

  prometheus:
    image: prom/prometheus:v3.2.1
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana:11.5.2
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_AUTH_ANONYMOUS_ENABLED: "true"
      GF_AUTH_ANONYMOUS_ORG_ROLE: Admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - jaeger
      - prometheus
```

**Step 4: Add npm script to apps/api/package.json**

Add to `scripts`:

```json
"docker:observability": "docker compose -f docker/docker-compose.observability.yml up -d",
"docker:observability:down": "docker compose -f docker/docker-compose.observability.yml down"
```

**Step 5: Verify docker compose validates**

Run: `cd apps/api && docker compose -f docker/docker-compose.observability.yml config`
Expected: Valid YAML output

**Step 6: Commit**

```bash
git add apps/api/docker/docker-compose.observability.yml apps/api/docker/prometheus/ apps/api/docker/grafana/ apps/api/package.json
git commit -m "feat(infra): add Jaeger, Prometheus, and Grafana docker infrastructure"
```

---

### Task 6: Add environment variables for OTel configuration

**Files:**

- Modify: `apps/api/.env`
- Modify: `apps/api/.env.test`

**Step 1: Add OTel env vars to .env**

Append to `apps/api/.env`:

```
# OpenTelemetry
OTEL_EXPORTER='otlp'
OTEL_SERVICE_NAME='api'
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT='http://localhost:4318/v1/traces'
OTEL_EXPORTER_OTLP_METRICS_ENDPOINT='http://localhost:4318/v1/metrics'
```

**Step 2: Add OTel env vars to .env.test (disable in tests)**

Append to `apps/api/.env.test`:

```
# OpenTelemetry — disabled in tests
OTEL_EXPORTER='console'
OTEL_SDK_DISABLED='true'
```

**Step 3: Commit**

```bash
git add apps/api/.env apps/api/.env.test
git commit -m "chore: add OpenTelemetry environment variables"
```

---

## Part B: GraphQL Hardening

### Task 7: Install graphql-armor

**Files:**

- Modify: `apps/api/package.json`

**Step 1: Install graphql-armor**

```bash
cd apps/api && pnpm add @escape.tech/graphql-armor
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add graphql-armor dependency"
```

---

### Task 8: Configure graphql-armor in Apollo Server

**Files:**

- Modify: `apps/api/src/app.module.ts`

**Step 1: Add graphql-armor to GraphQL module config**

In `app.module.ts`, update the `GraphQLModule.forRoot()` configuration to add graphql-armor plugins. Import and configure `ApolloArmor`:

```typescript
import { ApolloArmor } from "@escape.tech/graphql-armor";

const armor = new ApolloArmor({
  maxDepth: {
    n: parseInt(process.env.GQL_MAX_DEPTH || "10", 10),
  },
  costLimit: {
    maxCost: parseInt(process.env.GQL_MAX_COMPLEXITY || "1000", 10),
  },
  maxAliases: {
    n: parseInt(process.env.GQL_MAX_ALIASES || "15", 10),
  },
  blockFieldSuggestion: {
    enabled: true,
  },
});

const protection = armor.protect();
```

Then spread `...protection.plugins` into the Apollo `plugins` array and `...protection.validationRules` into the `validationRules` option of `GraphQLModule.forRoot()`.

**Step 2: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 3: Verify tests pass**

Run: `cd apps/api && pnpm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(graphql): add graphql-armor security (depth, complexity, alias limiting)"
```

---

### Task 9: Install JWT auth packages

**Files:**

- Modify: `apps/api/package.json`

**Step 1: Install JWT dependencies**

```bash
cd apps/api && pnpm add @nestjs/jwt @nestjs/passport passport passport-jwt && pnpm add -D @types/passport-jwt
```

**Step 2: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: add JWT authentication dependencies"
```

---

### Task 10: Create JWT auth infrastructure

**Files:**

- Create: `apps/api/src/infrastructure/auth/jwt.strategy.ts`
- Create: `apps/api/src/infrastructure/auth/gql-auth.guard.ts`
- Create: `apps/api/src/infrastructure/auth/roles.guard.ts`
- Create: `apps/api/src/infrastructure/auth/roles.decorator.ts`
- Create: `apps/api/src/infrastructure/auth/public.decorator.ts`
- Create: `apps/api/src/infrastructure/auth/auth.module.ts`

**Step 1: Create the Public decorator**

Create `apps/api/src/infrastructure/auth/public.decorator.ts`:

```typescript
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

**Step 2: Create the Roles decorator**

Create `apps/api/src/infrastructure/auth/roles.decorator.ts`:

```typescript
import { SetMetadata } from "@nestjs/common";
import { UserRoles } from "@modules/user/domain/user.types";

export const ROLES_KEY = "roles";
export const Roles = (...roles: UserRoles[]) => SetMetadata(ROLES_KEY, roles);
```

**Step 3: Create the JWT strategy**

Create `apps/api/src/infrastructure/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "default-secret-change-me",
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    return payload;
  }
}
```

**Step 4: Create the GQL auth guard**

Create `apps/api/src/infrastructure/auth/gql-auth.guard.ts`:

```typescript
import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class GqlAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): any {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }

  getRequest(context: ExecutionContext): any {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
```

**Step 5: Create the Roles guard**

Create `apps/api/src/infrastructure/auth/roles.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { ROLES_KEY } from "./roles.decorator";
import { IS_PUBLIC_KEY } from "./public.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) return true;

    const ctx = GqlExecutionContext.create(context);
    const user = ctx.getContext().req?.user;
    if (!user) return false;

    return requiredRoles.includes(user.role);
  }
}
```

**Step 6: Create the Auth module**

Create `apps/api/src/infrastructure/auth/auth.module.ts`:

```typescript
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "default-secret-change-me",
      signOptions: { expiresIn: "1h" },
    }),
  ],
  providers: [JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
```

**Step 7: Add JWT_SECRET to .env files**

Append to `apps/api/.env`:

```
# JWT
JWT_SECRET='your-secret-key-change-in-production'
```

Append to `apps/api/.env.test`:

```
JWT_SECRET='test-secret-key'
```

**Step 8: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 9: Commit**

```bash
git add apps/api/src/infrastructure/auth/ apps/api/.env apps/api/.env.test
git commit -m "feat(auth): add JWT authentication infrastructure with guards and decorators"
```

---

### Task 11: Register auth module and guards in AppModule

**Files:**

- Modify: `apps/api/src/app.module.ts`

**Step 1: Import AuthModule and register GqlAuthGuard globally**

In `app.module.ts`:

- Add `AuthModule` to imports
- Add `APP_GUARD` providers for `GqlAuthGuard` and `RolesGuard` (only for GraphQL)

```typescript
import { AuthModule } from "./infrastructure/auth/auth.module";
```

Add `AuthModule` to the `imports` array.

Note: The GqlAuthGuard should be applied per-resolver using decorators rather than globally to avoid affecting REST endpoints. Apply `@UseGuards(GqlAuthGuard)` on GraphQL resolvers and mark public ones with `@Public()`.

**Step 2: Update GraphQL resolvers to use auth**

Add `@UseGuards(GqlAuthGuard)` to GraphQL resolvers and `@Public()` to the `create` mutation (for now, since there's no user registration flow that returns a JWT yet):

In `create-user.graphql-resolver.ts`:

```typescript
import { Public } from "@src/infrastructure/auth/public.decorator";

@Resolver()
export class CreateUserGraphqlResolver {
  // ...
  @Public()
  @Mutation(() => IdGqlResponse)
  async create(/* ... */) {
    /* ... */
  }
}
```

In `find-users.graphql-resolver.ts`:

```typescript
import { UseGuards } from "@nestjs/common";
import { GqlAuthGuard } from "@src/infrastructure/auth/gql-auth.guard";
import { Public } from "@src/infrastructure/auth/public.decorator";

@UseGuards(GqlAuthGuard)
@Resolver()
export class FindUsersGraphqlResolver {
  // ...
  @Public() // Mark public for now — remove when auth flow is complete
  @Query(() => UserPaginatedGraphqlResponseDto)
  async findUsers(/* ... */) {
    /* ... */
  }
}
```

**Step 3: Verify build and tests**

Run: `pnpm build && cd apps/api && pnpm test`
Expected: BUILD SUCCESS, all tests pass

**Step 4: Commit**

```bash
git add apps/api/src/app.module.ts apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts apps/api/src/modules/user/queries/find-users/find-users.graphql-resolver.ts
git commit -m "feat(auth): register AuthModule and apply JWT guards to GraphQL resolvers"
```

---

### Task 12: Create GraphQL error formatter plugin

**Files:**

- Create: `apps/api/src/infrastructure/graphql/graphql-error-formatter.plugin.ts`

**Step 1: Create the error formatter**

```typescript
import { ApolloServerPlugin } from "@apollo/server";
import { GraphQLFormattedError } from "graphql";
import { Logger } from "@nestjs/common";
import { RequestContextService } from "@repo/core";

const logger = new Logger("GraphQLErrorFormatter");

export function createGraphqlErrorFormatterPlugin(): ApolloServerPlugin {
  return {
    async requestDidStart() {
      return {
        async didEncounterErrors(requestContext) {
          for (const error of requestContext.errors) {
            logger.error(
              {
                message: error.message,
                path: error.path,
                extensions: error.extensions,
                stack: error.originalError?.stack,
              },
              "GraphQL Error",
            );
          }
        },
      };
    },
  };
}

export function formatGraphqlError(
  formattedError: GraphQLFormattedError,
): GraphQLFormattedError {
  const isProduction = process.env.NODE_ENV === "production";

  let correlationId: string;
  try {
    correlationId = RequestContextService.getRequestId();
  } catch {
    correlationId = "unknown";
  }

  return {
    message: formattedError.message,
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: {
      code: formattedError.extensions?.code || "INTERNAL_SERVER_ERROR",
      correlationId,
      ...(isProduction
        ? {}
        : { stacktrace: formattedError.extensions?.stacktrace }),
    },
  };
}
```

**Step 2: Register in GraphQLModule config**

In `app.module.ts`, add to `GraphQLModule.forRoot()`:

```typescript
import { formatGraphqlError, createGraphqlErrorFormatterPlugin } from './infrastructure/graphql/graphql-error-formatter.plugin';

// In GraphQLModule.forRoot config:
formatError: formatGraphqlError,
plugins: [...protection.plugins, createGraphqlErrorFormatterPlugin()],
```

**Step 3: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add apps/api/src/infrastructure/graphql/graphql-error-formatter.plugin.ts apps/api/src/app.module.ts
git commit -m "feat(graphql): add error formatter with correlationId and production stripping"
```

---

## Part C: Architecture Enforcement

### Task 13: Add circular dependency detection to dependency-cruiser

**Files:**

- Modify: `apps/api/.dependency-cruiser.js`

**Step 1: Add no-circular rule**

Add the following rule to the `forbidden` array in `.dependency-cruiser.js`:

```javascript
{
  name: 'no-circular',
  severity: 'error',
  comment: 'Circular dependencies lead to hard-to-maintain code. Break cycles by introducing interfaces or events.',
  from: {},
  to: {
    circular: true,
  },
},
```

**Step 2: Run dependency validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: No circular dependency violations

**Step 3: Commit**

```bash
git add apps/api/.dependency-cruiser.js
git commit -m "feat(arch): add circular dependency detection rule"
```

---

### Task 14: Add cross-module import prevention rule

**Files:**

- Modify: `apps/api/.dependency-cruiser.js`

**Step 1: Add cross-module rule**

Add the following rule to the `forbidden` array:

```javascript
{
  name: 'no-cross-module-imports-except-events',
  severity: 'error',
  comment: 'Modules must communicate only via domain events. Direct imports between modules are forbidden except for domain event classes.',
  from: {
    path: 'src/modules/([^/]+)/',
    pathNot: 'src/modules/([^/]+)/.*\\.module\\.ts$',
  },
  to: {
    path: 'src/modules/([^/]+)/',
    pathNot: [
      'src/modules/$1/',
      'src/modules/[^/]+/domain/events/.*\\.domain-event\\.ts$',
    ],
  },
},
```

**Step 2: Run dependency validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: No violations (existing cross-module imports are only for domain events)

**Step 3: Commit**

```bash
git add apps/api/.dependency-cruiser.js
git commit -m "feat(arch): add cross-module import prevention rule (events only allowed)"
```

---

### Task 15: Document module boundaries

**Files:**

- Create: `docs/architecture/module-boundaries.md`

**Step 1: Write module boundaries doc**

```markdown
# Module Boundaries

## Overview

This project enforces strict module boundaries. Modules communicate only via **domain events** — never by importing each other's entities, services, or repositories.

## Modules

### User Module (`src/modules/user/`)

**Public contract (exported to other modules):**

- `UserCreatedDomainEvent` — emitted when a new user is created
- `UserDeletedDomainEvent` — emitted when a user is deleted
- `UserRoleChangedDomainEvent` — emitted when a user's role changes
- `UserAddressUpdatedDomainEvent` — emitted when a user's address is updated

**Internal (not available to other modules):**

- `UserEntity`, `UserProps`, `CreateUserProps`
- `UserRepositoryPort`, `UserRepository`
- `CreateUserService`, `DeleteUserService`
- All controllers and DTOs

### Wallet Module (`src/modules/wallet/`)

**Public contract (exported to other modules):**

- `WalletCreatedDomainEvent` — emitted when a wallet is created
- `FundsTransferredDomainEvent` — emitted when funds are transferred (Phase 4)

**Internal (not available to other modules):**

- `WalletEntity`, `WalletProps`, `CreateWalletProps`
- `WalletRepositoryPort`, `WalletRepository`
- All command handlers and event handlers

## Communication Flow
```

User Module Wallet Module
┌─────────────┐ ┌─────────────────────┐
│ UserEntity │ │ WalletEntity │
│ .create() │──emits──► │ │
│ │ UserCreated │ EventHandler │
│ │ DomainEvent ─────►│ creates wallet │
│ │ │ emits WalletCreated │
└─────────────┘ └─────────────────────┘

```

## Enforcement

Cross-module imports are enforced by `dependency-cruiser` (`pnpm deps:validate`). The rule `no-cross-module-imports-except-events` will fail the build if any module imports from another module's internals.

Allowed: `import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';`

Forbidden: `import { UserEntity } from '@modules/user/domain/user.entity';` (from wallet module)
```

**Step 2: Commit**

```bash
git add docs/architecture/module-boundaries.md
git commit -m "docs: add module boundaries documentation"
```

---

## Part D: Advanced DDD Patterns

### Task 16: Create database migration for sagas and user_wallet_summary

**Files:**

- Create: `apps/api/database/migrations/V3__sagas.sql`
- Create: `apps/api/database/migrations/V4__user_wallet_summary.sql`

**Step 1: Create sagas migration**

Create `apps/api/database/migrations/V3__sagas.sql`:

```sql
CREATE TABLE "sagas" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "type" character varying NOT NULL,
  "state" character varying NOT NULL,
  "payload" jsonb NOT NULL DEFAULT '{}',
  "aggregateId" character varying NOT NULL,
  CONSTRAINT "PK_sagas" PRIMARY KEY ("id")
);

CREATE INDEX "IDX_sagas_type_aggregateId" ON "sagas" ("type", "aggregateId");
CREATE INDEX "IDX_sagas_state" ON "sagas" ("state");
```

**Step 2: Create user_wallet_summary migration**

Create `apps/api/database/migrations/V4__user_wallet_summary.sql`:

```sql
CREATE TABLE "user_wallet_summary" (
  "id" character varying NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "userId" character varying NOT NULL,
  "email" character varying,
  "country" character varying,
  "walletId" character varying,
  "balance" integer DEFAULT 0,
  CONSTRAINT "PK_user_wallet_summary" PRIMARY KEY ("id"),
  CONSTRAINT "UQ_user_wallet_summary_userId" UNIQUE ("userId")
);
```

**Step 3: Commit**

```bash
git add apps/api/database/migrations/V3__sagas.sql apps/api/database/migrations/V4__user_wallet_summary.sql
git commit -m "feat(db): add sagas and user_wallet_summary migrations"
```

---

### Task 17: Add wallet domain errors and FundsTransferredDomainEvent

**Files:**

- Modify: `apps/api/src/modules/wallet/domain/wallet.errors.ts`
- Create: `apps/api/src/modules/wallet/domain/events/funds-transferred.domain-event.ts`

**Step 1: Write test for new domain errors**

Create `apps/api/src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`:

```typescript
import { WalletNotEnoughBalanceError } from "../wallet.errors";

describe("Wallet Errors", () => {
  describe("WalletNotEnoughBalanceError", () => {
    it("has correct code and message", () => {
      const error = new WalletNotEnoughBalanceError();
      expect(error.code).toBe("WALLET.NOT_ENOUGH_BALANCE");
      expect(error.message).toBe("Wallet has not enough balance");
    });
  });
});
```

**Step 2: Run test to verify it passes with existing code**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`
Expected: PASS

**Step 3: Add new error types to wallet.errors.ts**

Add to `apps/api/src/modules/wallet/domain/wallet.errors.ts`:

```typescript
export class InsufficientBalanceError extends ExceptionBase {
  static readonly message = "Insufficient balance for transfer";
  public readonly code = "WALLET.INSUFFICIENT_BALANCE";

  constructor(metadata?: unknown) {
    super(InsufficientBalanceError.message, undefined, metadata);
  }
}

export class SameWalletTransferError extends ExceptionBase {
  static readonly message = "Cannot transfer to the same wallet";
  public readonly code = "WALLET.SAME_WALLET_TRANSFER";

  constructor(metadata?: unknown) {
    super(SameWalletTransferError.message, undefined, metadata);
  }
}
```

**Step 4: Write test for new errors**

Add to the test file:

```typescript
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from "../wallet.errors";

describe("InsufficientBalanceError", () => {
  it("has correct code and message", () => {
    const error = new InsufficientBalanceError();
    expect(error.code).toBe("WALLET.INSUFFICIENT_BALANCE");
    expect(error.message).toBe("Insufficient balance for transfer");
  });
});

describe("SameWalletTransferError", () => {
  it("has correct code and message", () => {
    const error = new SameWalletTransferError();
    expect(error.code).toBe("WALLET.SAME_WALLET_TRANSFER");
    expect(error.message).toBe("Cannot transfer to the same wallet");
  });
});
```

**Step 5: Run tests**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/domain/__tests__/wallet.errors.spec.ts`
Expected: PASS

**Step 6: Create FundsTransferredDomainEvent**

Create `apps/api/src/modules/wallet/domain/events/funds-transferred.domain-event.ts`:

```typescript
import { DomainEvent, DomainEventProps } from "@repo/core";

export class FundsTransferredDomainEvent extends DomainEvent {
  readonly sourceWalletId: string;
  readonly targetWalletId: string;
  readonly amount: number;

  constructor(props: DomainEventProps<FundsTransferredDomainEvent>) {
    super(props);
    this.sourceWalletId = props.sourceWalletId;
    this.targetWalletId = props.targetWalletId;
    this.amount = props.amount;
  }
}
```

**Step 7: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 8: Commit**

```bash
git add apps/api/src/modules/wallet/domain/wallet.errors.ts apps/api/src/modules/wallet/domain/events/funds-transferred.domain-event.ts apps/api/src/modules/wallet/domain/__tests__/
git commit -m "feat(wallet): add transfer-related domain errors and FundsTransferredDomainEvent"
```

---

### Task 18: Create Transfer Funds domain service

**Files:**

- Create: `apps/api/src/modules/wallet/domain/services/transfer-funds.domain-service.ts`
- Create: `apps/api/src/modules/wallet/domain/__tests__/transfer-funds.domain-service.spec.ts`

**Step 1: Write the failing test**

Create `apps/api/src/modules/wallet/domain/__tests__/transfer-funds.domain-service.spec.ts`:

```typescript
import { TransferFundsDomainService } from "../services/transfer-funds.domain-service";
import { WalletEntity } from "../wallet.entity";
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from "../wallet.errors";
import { FundsTransferredDomainEvent } from "../events/funds-transferred.domain-event";

describe("TransferFundsDomainService", () => {
  function createWalletWithBalance(balance: number): WalletEntity {
    const wallet = WalletEntity.create({ userId: `user-${Math.random()}` });
    if (balance > 0) wallet.deposit(balance);
    return wallet;
  }

  describe("transfer", () => {
    it("transfers funds between two wallets", () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(50);

      const result = TransferFundsDomainService.transfer(source, target, 30);

      expect(result.isOk()).toBe(true);
      expect(source.getProps().balance).toBe(70);
      expect(target.getProps().balance).toBe(80);
    });

    it("emits FundsTransferredDomainEvent on source wallet", () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(0);
      source.clearEvents(); // clear creation event

      TransferFundsDomainService.transfer(source, target, 50);

      const transferEvent = source.domainEvents.find(
        (e) => e instanceof FundsTransferredDomainEvent,
      );
      expect(transferEvent).toBeDefined();
      expect((transferEvent as FundsTransferredDomainEvent).amount).toBe(50);
    });

    it("returns error when source has insufficient balance", () => {
      const source = createWalletWithBalance(10);
      const target = createWalletWithBalance(0);

      const result = TransferFundsDomainService.transfer(source, target, 50);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InsufficientBalanceError);
      }
    });

    it("returns error when transferring to same wallet", () => {
      const wallet = createWalletWithBalance(100);

      const result = TransferFundsDomainService.transfer(wallet, wallet, 10);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SameWalletTransferError);
      }
    });

    it("returns error when amount is zero or negative", () => {
      const source = createWalletWithBalance(100);
      const target = createWalletWithBalance(0);

      const resultZero = TransferFundsDomainService.transfer(source, target, 0);
      expect(resultZero.isErr()).toBe(true);

      const resultNeg = TransferFundsDomainService.transfer(source, target, -5);
      expect(resultNeg.isErr()).toBe(true);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/domain/__tests__/transfer-funds.domain-service.spec.ts`
Expected: FAIL — cannot find module

**Step 3: Implement the domain service**

Create `apps/api/src/modules/wallet/domain/services/transfer-funds.domain-service.ts`:

```typescript
import { Result, ok, err } from "neverthrow";
import { WalletEntity } from "../wallet.entity";
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from "../wallet.errors";
import { FundsTransferredDomainEvent } from "../events/funds-transferred.domain-event";
import { ArgumentOutOfRangeException } from "@repo/core";

export class TransferFundsDomainService {
  static transfer(
    source: WalletEntity,
    target: WalletEntity,
    amount: number,
  ): Result<
    void,
    | InsufficientBalanceError
    | SameWalletTransferError
    | ArgumentOutOfRangeException
  > {
    if (amount <= 0) {
      return err(
        new ArgumentOutOfRangeException("Transfer amount must be positive"),
      );
    }

    if (source.id === target.id) {
      return err(new SameWalletTransferError());
    }

    const withdrawResult = source.withdraw(amount);
    if (withdrawResult.isErr()) {
      return err(new InsufficientBalanceError());
    }

    target.deposit(amount);

    source.addEvent(
      new FundsTransferredDomainEvent({
        aggregateId: source.id,
        sourceWalletId: source.id,
        targetWalletId: target.id,
        amount,
      }),
    );

    return ok(undefined);
  }
}
```

Note: `addEvent` is a protected method on `AggregateRoot`. We need to check if this is accessible. If not, we'll need to add a public method on `WalletEntity` for emitting transfer events. Check `WalletEntity` — `addEvent` is `protected`, so we need to call it within the entity or expose a method.

Alternative approach — add a `transferTo` method on `WalletEntity` instead:

```typescript
// In wallet.entity.ts, add:
transferTo(target: WalletEntity, amount: number): Result<void, InsufficientBalanceError | SameWalletTransferError> {
  // Domain service logic lives here, invoked by TransferFundsDomainService
}
```

Or make the domain service call entity methods that emit events internally. The simplest approach: have the domain service orchestrate but let each entity handle its own state changes and events. Update `WalletEntity` to have a method that accepts a transfer and emits the event.

Adjust the implementation so `WalletEntity` has `emitTransferEvent()` or the domain service constructs the event and calls a public method. Since `addEvent` is protected, the cleanest pattern is to add a method on the entity:

In `wallet.entity.ts`, add:

```typescript
recordTransfer(targetWalletId: string, amount: number): void {
  this.addEvent(
    new FundsTransferredDomainEvent({
      aggregateId: this.id,
      sourceWalletId: this.id,
      targetWalletId,
      amount,
    }),
  );
}
```

Then the domain service calls `source.recordTransfer(target.id, amount)`.

**Step 4: Run test to verify it passes**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/domain/__tests__/transfer-funds.domain-service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/wallet/domain/services/ apps/api/src/modules/wallet/domain/__tests__/ apps/api/src/modules/wallet/domain/wallet.entity.ts
git commit -m "feat(wallet): add TransferFundsDomainService with TDD"
```

---

### Task 19: Create Transfer Funds command and handler

**Files:**

- Create: `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.command.ts`
- Create: `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.service.ts`
- Create: `apps/api/src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.feature`
- Create: `apps/api/src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.spec.ts`

**Step 1: Write the BDD feature file**

Create `apps/api/src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.feature`:

```gherkin
Feature: Transfer funds between wallets (command handler)

  Scenario: Successfully transferring funds
    Given a source wallet with balance 100 and a target wallet with balance 50
    When I execute the transfer funds command for amount 30
    Then the result is ok
    And the source wallet balance is 70
    And the target wallet balance is 80

  Scenario: Failing to transfer with insufficient balance
    Given a source wallet with balance 10 and a target wallet with balance 50
    When I execute the transfer funds command for amount 50
    Then the result is an error of type InsufficientBalanceError

  Scenario: Failing to transfer to same wallet
    Given a source wallet with balance 100
    When I execute the transfer funds command to the same wallet for amount 10
    Then the result is an error of type SameWalletTransferError
```

**Step 2: Create the command**

Create `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.command.ts`:

```typescript
import { Command, CommandProps } from "@repo/core";

export class TransferFundsCommand extends Command {
  readonly sourceWalletId: string;
  readonly targetWalletId: string;
  readonly amount: number;

  constructor(props: CommandProps<TransferFundsCommand>) {
    super(props);
    this.sourceWalletId = props.sourceWalletId;
    this.targetWalletId = props.targetWalletId;
    this.amount = props.amount;
  }
}
```

**Step 3: Create the command handler**

Create `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.service.ts`:

```typescript
import { CommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { Result, err, ok } from "neverthrow";
import { NotFoundException } from "@repo/core";
import { TransferFundsCommand } from "./transfer-funds.command";
import { WalletRepositoryPort } from "../../database/wallet.repository.port";
import { WALLET_REPOSITORY } from "../../wallet.di-tokens";
import { TransferFundsDomainService } from "../../domain/services/transfer-funds.domain-service";
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from "../../domain/wallet.errors";

@CommandHandler(TransferFundsCommand)
export class TransferFundsService {
  constructor(
    @Inject(WALLET_REPOSITORY)
    private readonly walletRepo: WalletRepositoryPort,
  ) {}

  async execute(
    command: TransferFundsCommand,
  ): Promise<
    Result<
      void,
      InsufficientBalanceError | SameWalletTransferError | NotFoundException
    >
  > {
    const source = await this.walletRepo.findOneById(command.sourceWalletId);
    if (!source) return err(new NotFoundException("Source wallet not found"));

    const target = await this.walletRepo.findOneById(command.targetWalletId);
    if (!target) return err(new NotFoundException("Target wallet not found"));

    const transferResult = TransferFundsDomainService.transfer(
      source,
      target,
      command.amount,
    );

    if (transferResult.isErr()) return err(transferResult.error);

    await this.walletRepo.transaction(async () => {
      // Save both wallets — repository publishes domain events
      await this.walletRepo.insert(source);
      await this.walletRepo.insert(target);
    });

    return ok(undefined);
  }
}
```

Note: The `insert` method on `SqlRepositoryBase` handles both insert and update via upsert, or we may need a dedicated `save`/`update` method on the wallet repository. Check the existing `SqlRepositoryBase` — if it only supports `insert`, we need to add an `update` method to `WalletRepository`. The wallet repo currently has no `update` method, so we'll need to add one. For the BDD test, we mock the repo so this doesn't matter for unit tests.

**Step 4: Write the BDD spec**

Create `apps/api/src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.spec.ts`:

```typescript
import { defineFeature, loadFeature } from "jest-cucumber";
import { TransferFundsService } from "../transfer-funds.service";
import { TransferFundsCommand } from "../transfer-funds.command";
import { WalletEntity } from "@modules/wallet/domain/wallet.entity";
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from "@modules/wallet/domain/wallet.errors";
import { Result } from "neverthrow";

const feature = loadFeature(
  "src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.feature",
);

defineFeature(feature, (test) => {
  let service: TransferFundsService;
  let sourceWallet: WalletEntity;
  let targetWallet: WalletEntity;
  let mockRepo: {
    findOneById: jest.Mock;
    insert: jest.Mock;
    transaction: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    delete: jest.Mock;
  };
  let result: Result<void, any>;

  beforeEach(() => {
    mockRepo = {
      findOneById: jest.fn(),
      insert: jest.fn().mockResolvedValue(undefined),
      transaction: jest.fn((handler: () => Promise<any>) => handler()),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      delete: jest.fn(),
    };
    service = new TransferFundsService(mockRepo as any);
  });

  test("Successfully transferring funds", ({ given, when, then, and }) => {
    given(
      /^a source wallet with balance (\d+) and a target wallet with balance (\d+)$/,
      (sourceBalance: string, targetBalance: string) => {
        sourceWallet = WalletEntity.create({ userId: "user-1" });
        sourceWallet.deposit(parseInt(sourceBalance, 10));
        targetWallet = WalletEntity.create({ userId: "user-2" });
        targetWallet.deposit(parseInt(targetBalance, 10));
        mockRepo.findOneById
          .mockResolvedValueOnce(sourceWallet)
          .mockResolvedValueOnce(targetWallet);
      },
    );

    when(
      /^I execute the transfer funds command for amount (\d+)$/,
      async (amount: string) => {
        const command = new TransferFundsCommand({
          sourceWalletId: sourceWallet.id,
          targetWalletId: targetWallet.id,
          amount: parseInt(amount, 10),
        });
        result = await service.execute(command);
      },
    );

    then("the result is ok", () => {
      expect(result.isOk()).toBe(true);
    });

    and(/^the source wallet balance is (\d+)$/, (balance: string) => {
      expect(sourceWallet.getProps().balance).toBe(parseInt(balance, 10));
    });

    and(/^the target wallet balance is (\d+)$/, (balance: string) => {
      expect(targetWallet.getProps().balance).toBe(parseInt(balance, 10));
    });
  });

  test("Failing to transfer with insufficient balance", ({
    given,
    when,
    then,
  }) => {
    given(
      /^a source wallet with balance (\d+) and a target wallet with balance (\d+)$/,
      (sourceBalance: string, targetBalance: string) => {
        sourceWallet = WalletEntity.create({ userId: "user-1" });
        sourceWallet.deposit(parseInt(sourceBalance, 10));
        targetWallet = WalletEntity.create({ userId: "user-2" });
        targetWallet.deposit(parseInt(targetBalance, 10));
        mockRepo.findOneById
          .mockResolvedValueOnce(sourceWallet)
          .mockResolvedValueOnce(targetWallet);
      },
    );

    when(
      /^I execute the transfer funds command for amount (\d+)$/,
      async (amount: string) => {
        const command = new TransferFundsCommand({
          sourceWalletId: sourceWallet.id,
          targetWalletId: targetWallet.id,
          amount: parseInt(amount, 10),
        });
        result = await service.execute(command);
      },
    );

    then("the result is an error of type InsufficientBalanceError", () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(InsufficientBalanceError);
      }
    });
  });

  test("Failing to transfer to same wallet", ({ given, when, then }) => {
    given(/^a source wallet with balance (\d+)$/, (balance: string) => {
      sourceWallet = WalletEntity.create({ userId: "user-1" });
      sourceWallet.deposit(parseInt(balance, 10));
      mockRepo.findOneById
        .mockResolvedValueOnce(sourceWallet)
        .mockResolvedValueOnce(sourceWallet);
    });

    when(
      /^I execute the transfer funds command to the same wallet for amount (\d+)$/,
      async (amount: string) => {
        const command = new TransferFundsCommand({
          sourceWalletId: sourceWallet.id,
          targetWalletId: sourceWallet.id,
          amount: parseInt(amount, 10),
        });
        result = await service.execute(command);
      },
    );

    then("the result is an error of type SameWalletTransferError", () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(SameWalletTransferError);
      }
    });
  });
});
```

**Step 5: Run tests**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/wallet/commands/transfer-funds/__tests__/transfer-funds.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add apps/api/src/modules/wallet/commands/transfer-funds/
git commit -m "feat(wallet): add TransferFunds command handler with BDD tests"
```

---

### Task 20: Create Transfer Funds HTTP controller and request DTO

**Files:**

- Create: `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.request.dto.ts`
- Create: `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.http.controller.ts`

**Step 1: Create request DTO**

Create `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.request.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsPositive, IsUUID } from "class-validator";

export class TransferFundsRequestDto {
  @ApiProperty({
    example: "2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231",
    description: "Source wallet ID",
  })
  @IsUUID()
  readonly sourceWalletId: string;

  @ApiProperty({
    example: "3bdf9ab2-7e61-50dd-cb25-65f5bd8fc342",
    description: "Target wallet ID",
  })
  @IsUUID()
  readonly targetWalletId: string;

  @ApiProperty({
    example: 100,
    description: "Amount to transfer (integer, in cents)",
  })
  @IsInt()
  @IsPositive()
  readonly amount: number;
}
```

**Step 2: Create HTTP controller**

Create `apps/api/src/modules/wallet/commands/transfer-funds/transfer-funds.http.controller.ts`:

```typescript
import {
  Body,
  Controller,
  HttpStatus,
  Post,
  BadRequestException,
  NotFoundException as NotFoundHttpException,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Result } from "neverthrow";
import { ApiErrorResponse, NotFoundException } from "@repo/core";
import { routesV1 } from "@config/app.routes";
import { TransferFundsCommand } from "./transfer-funds.command";
import { TransferFundsRequestDto } from "./transfer-funds.request.dto";
import {
  InsufficientBalanceError,
  SameWalletTransferError,
} from "../../domain/wallet.errors";

@Controller(routesV1.version)
export class TransferFundsHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @ApiOperation({ summary: "Transfer funds between wallets" })
  @ApiResponse({ status: HttpStatus.OK, description: "Funds transferred" })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Invalid transfer",
    type: ApiErrorResponse,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Wallet not found",
    type: ApiErrorResponse,
  })
  @Post(`${routesV1.wallet.root}/transfer`)
  async transfer(@Body() body: TransferFundsRequestDto): Promise<void> {
    const command = new TransferFundsCommand(body);
    const result: Result<
      void,
      InsufficientBalanceError | SameWalletTransferError | NotFoundException
    > = await this.commandBus.execute(command);

    result.match(
      () => undefined,
      (error) => {
        if (error instanceof NotFoundException)
          throw new NotFoundHttpException(error.message);
        throw new BadRequestException(error.message);
      },
    );
  }
}
```

**Step 3: Register in WalletModule**

Update `apps/api/src/modules/wallet/wallet.module.ts` to add:

- `TransferFundsHttpController` to `controllers`
- `TransferFundsService` to `providers`

Import `CqrsModule` in the wallet module imports.

**Step 4: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 5: Commit**

```bash
git add apps/api/src/modules/wallet/commands/ apps/api/src/modules/wallet/wallet.module.ts
git commit -m "feat(wallet): add TransferFunds HTTP controller and register in module"
```

---

### Task 21: Create User Registration Saga

**Files:**

- Create: `apps/api/src/modules/user/application/sagas/user-registration.saga-state.ts`
- Create: `apps/api/src/modules/user/application/sagas/user-registration.saga.ts`

**Step 1: Define saga states**

Create `apps/api/src/modules/user/application/sagas/user-registration.saga-state.ts`:

```typescript
export enum UserRegistrationSagaState {
  STARTED = "started",
  WALLET_CREATED = "wallet_created",
  COMPLETED = "completed",
  FAILED = "failed",
  COMPENSATING = "compensating",
  COMPENSATED = "compensated",
}

export enum UserRegistrationSagaType {
  USER_REGISTRATION = "user_registration",
}
```

**Step 2: Create the saga entity**

Create `apps/api/src/modules/user/application/sagas/user-registration.saga.ts`:

```typescript
import { AggregateRoot, AggregateID } from "@repo/core";
import { randomUUID } from "node:crypto";
import {
  UserRegistrationSagaState,
  UserRegistrationSagaType,
} from "./user-registration.saga-state";

export interface SagaProps {
  type: string;
  state: string;
  aggregateId: string;
  payload: Record<string, unknown>;
}

export interface CreateSagaProps {
  aggregateId: string;
  payload?: Record<string, unknown>;
}

export class UserRegistrationSaga extends AggregateRoot<SagaProps> {
  protected readonly _id: AggregateID;

  static create(props: CreateSagaProps): UserRegistrationSaga {
    const id = randomUUID();
    return new UserRegistrationSaga({
      id,
      props: {
        type: UserRegistrationSagaType.USER_REGISTRATION,
        state: UserRegistrationSagaState.STARTED,
        aggregateId: props.aggregateId,
        payload: props.payload ?? {},
      },
    });
  }

  get state(): string {
    return this.props.state;
  }

  get sagaType(): string {
    return this.props.type;
  }

  get aggregateId(): string {
    return this.props.aggregateId;
  }

  walletCreated(walletId: string): void {
    this.props.state = UserRegistrationSagaState.WALLET_CREATED;
    this.props.payload = { ...this.props.payload, walletId };
  }

  complete(): void {
    this.props.state = UserRegistrationSagaState.COMPLETED;
  }

  fail(reason: string): void {
    this.props.state = UserRegistrationSagaState.FAILED;
    this.props.payload = { ...this.props.payload, failureReason: reason };
  }

  startCompensation(): void {
    this.props.state = UserRegistrationSagaState.COMPENSATING;
  }

  compensated(): void {
    this.props.state = UserRegistrationSagaState.COMPENSATED;
  }

  validate(): void {
    // Saga state machine validations
  }
}
```

**Step 3: Write saga unit tests**

Create `apps/api/src/modules/user/application/sagas/__tests__/user-registration.saga.spec.ts`:

```typescript
import { UserRegistrationSaga } from "../user-registration.saga";
import { UserRegistrationSagaState } from "../user-registration.saga-state";

describe("UserRegistrationSaga", () => {
  it("creates with STARTED state", () => {
    const saga = UserRegistrationSaga.create({ aggregateId: "user-1" });
    expect(saga.state).toBe(UserRegistrationSagaState.STARTED);
  });

  it("transitions to WALLET_CREATED", () => {
    const saga = UserRegistrationSaga.create({ aggregateId: "user-1" });
    saga.walletCreated("wallet-1");
    expect(saga.state).toBe(UserRegistrationSagaState.WALLET_CREATED);
  });

  it("transitions to COMPLETED", () => {
    const saga = UserRegistrationSaga.create({ aggregateId: "user-1" });
    saga.walletCreated("wallet-1");
    saga.complete();
    expect(saga.state).toBe(UserRegistrationSagaState.COMPLETED);
  });

  it("transitions to FAILED", () => {
    const saga = UserRegistrationSaga.create({ aggregateId: "user-1" });
    saga.fail("wallet creation failed");
    expect(saga.state).toBe(UserRegistrationSagaState.FAILED);
  });

  it("handles compensation flow", () => {
    const saga = UserRegistrationSaga.create({ aggregateId: "user-1" });
    saga.fail("error");
    saga.startCompensation();
    expect(saga.state).toBe(UserRegistrationSagaState.COMPENSATING);
    saga.compensated();
    expect(saga.state).toBe(UserRegistrationSagaState.COMPENSATED);
  });
});
```

**Step 4: Run tests**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/user/application/sagas/__tests__/user-registration.saga.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add apps/api/src/modules/user/application/sagas/
git commit -m "feat(user): add UserRegistrationSaga with state machine"
```

---

### Task 22: Create Saga repository and persistence

**Files:**

- Create: `apps/api/src/modules/user/database/saga.repository.port.ts`
- Create: `apps/api/src/modules/user/database/saga.repository.ts`
- Create: `apps/api/src/modules/user/application/sagas/saga.mapper.ts`

**Step 1: Create saga repository port**

Create `apps/api/src/modules/user/database/saga.repository.port.ts`:

```typescript
import { UserRegistrationSaga } from "../application/sagas/user-registration.saga";

export interface SagaRepositoryPort {
  insert(saga: UserRegistrationSaga): Promise<void>;
  findByAggregateId(
    aggregateId: string,
  ): Promise<UserRegistrationSaga | undefined>;
  update(saga: UserRegistrationSaga): Promise<void>;
}
```

**Step 2: Create saga Zod schema and repository**

Create `apps/api/src/modules/user/database/saga.repository.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { z } from "zod";
import { SagaRepositoryPort } from "./saga.repository.port";
import { UserRegistrationSaga } from "../application/sagas/user-registration.saga";
import { SagaMapper } from "../application/sagas/saga.mapper";

export const sagaSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  type: z.string(),
  state: z.string(),
  payload: z.record(z.unknown()),
  aggregateId: z.string(),
});

export type SagaModel = z.infer<typeof sagaSchema>;

@Injectable()
export class SagaRepository implements SagaRepositoryPort {
  private readonly logger = new Logger(SagaRepository.name);

  constructor(
    @InjectPool() private readonly pool: DatabasePool,
    private readonly mapper: SagaMapper,
  ) {}

  async insert(saga: UserRegistrationSaga): Promise<void> {
    const record = this.mapper.toPersistence(saga);
    await this.pool.query(sql.type(sagaSchema)`
      INSERT INTO "sagas" ("id", "createdAt", "updatedAt", "type", "state", "payload", "aggregateId")
      VALUES (${record.id}, ${sql.timestamp(record.createdAt)}, ${sql.timestamp(record.updatedAt)}, ${record.type}, ${record.state}, ${sql.jsonb(record.payload)}, ${record.aggregateId})
    `);
  }

  async findByAggregateId(
    aggregateId: string,
  ): Promise<UserRegistrationSaga | undefined> {
    const result = await this.pool.maybeOne(
      sql.type(
        sagaSchema,
      )`SELECT * FROM "sagas" WHERE "aggregateId" = ${aggregateId} ORDER BY "createdAt" DESC LIMIT 1`,
    );
    if (!result) return undefined;
    return this.mapper.toDomain(result);
  }

  async update(saga: UserRegistrationSaga): Promise<void> {
    const record = this.mapper.toPersistence(saga);
    await this.pool.query(sql.type(sagaSchema)`
      UPDATE "sagas" SET
        "state" = ${record.state},
        "payload" = ${sql.jsonb(record.payload)},
        "updatedAt" = ${sql.timestamp(new Date())}
      WHERE "id" = ${record.id}
    `);
  }
}
```

**Step 3: Create saga mapper**

Create `apps/api/src/modules/user/application/sagas/saga.mapper.ts`:

```typescript
import { Injectable } from "@nestjs/common";
import { UserRegistrationSaga } from "./user-registration.saga";
import { SagaModel, sagaSchema } from "../../database/saga.repository";

@Injectable()
export class SagaMapper {
  toPersistence(saga: UserRegistrationSaga): SagaModel {
    const props = saga.getProps();
    const record: SagaModel = {
      id: props.id,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      type: props.type,
      state: props.state,
      payload: props.payload,
      aggregateId: props.aggregateId,
    };
    return sagaSchema.parse(record);
  }

  toDomain(record: SagaModel): UserRegistrationSaga {
    return new UserRegistrationSaga({
      id: record.id,
      createdAt: new Date(record.createdAt),
      updatedAt: new Date(record.updatedAt),
      props: {
        type: record.type,
        state: record.state,
        aggregateId: record.aggregateId,
        payload: record.payload as Record<string, unknown>,
      },
    });
  }
}
```

**Step 4: Add DI token**

Add to `apps/api/src/modules/user/user.di-tokens.ts`:

```typescript
export const SAGA_REPOSITORY = Symbol("SAGA_REPOSITORY");
```

**Step 5: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 6: Commit**

```bash
git add apps/api/src/modules/user/database/saga.repository.port.ts apps/api/src/modules/user/database/saga.repository.ts apps/api/src/modules/user/application/sagas/saga.mapper.ts apps/api/src/modules/user/user.di-tokens.ts
git commit -m "feat(user): add saga repository with Zod schema and mapper"
```

---

### Task 23: Upgrade event handler to saga-based orchestration

**Files:**

- Modify: `apps/api/src/modules/wallet/application/event-handlers/create-wallet-when-user-is-created.domain-event-handler.ts`
- Create: `apps/api/src/modules/user/application/sagas/saga-event-handlers.ts`
- Modify: `apps/api/src/modules/user/user.module.ts`

**Step 1: Create saga event handlers**

The existing `CreateWalletWhenUserIsCreatedDomainEventHandler` in the wallet module stays as-is (it creates the wallet). We add saga tracking handlers in the user module.

Create `apps/api/src/modules/user/application/sagas/saga-event-handlers.ts`:

```typescript
import { Injectable, Inject, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { UserCreatedDomainEvent } from "@modules/user/domain/events/user-created.domain-event";
import { WalletCreatedDomainEvent } from "@modules/wallet/domain/events/wallet-created.domain-event";
import { SagaRepositoryPort } from "../../database/saga.repository.port";
import { SAGA_REPOSITORY } from "../../user.di-tokens";
import { UserRegistrationSaga } from "./user-registration.saga";

@Injectable()
export class UserRegistrationSagaHandler {
  private readonly logger = new Logger(UserRegistrationSagaHandler.name);

  constructor(
    @Inject(SAGA_REPOSITORY)
    private readonly sagaRepo: SagaRepositoryPort,
  ) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async onUserCreated(event: UserCreatedDomainEvent): Promise<void> {
    this.logger.log(`Starting registration saga for user ${event.aggregateId}`);
    const saga = UserRegistrationSaga.create({
      aggregateId: event.aggregateId,
      payload: { email: event.email },
    });
    await this.sagaRepo.insert(saga);
  }

  @OnEvent(WalletCreatedDomainEvent.name, { async: true, promisify: true })
  async onWalletCreated(event: WalletCreatedDomainEvent): Promise<void> {
    const saga = await this.sagaRepo.findByAggregateId(event.userId);
    if (!saga) {
      this.logger.warn(`No saga found for user ${event.userId}`);
      return;
    }

    saga.walletCreated(event.aggregateId);
    saga.complete();
    await this.sagaRepo.update(saga);
    this.logger.log(`Registration saga completed for user ${event.userId}`);
  }
}
```

**Step 2: Register saga components in UserModule**

Update `apps/api/src/modules/user/user.module.ts`:

- Add `SagaMapper` to mappers
- Add `{ provide: SAGA_REPOSITORY, useClass: SagaRepository }` to repositories
- Add `UserRegistrationSagaHandler` to a new `sagaHandlers` array in providers

**Step 3: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 4: Run all tests**

Run: `cd apps/api && pnpm test`
Expected: All tests pass

**Step 5: Commit**

```bash
git add apps/api/src/modules/user/application/sagas/saga-event-handlers.ts apps/api/src/modules/user/user.module.ts
git commit -m "feat(user): add saga-based user registration orchestration"
```

---

### Task 24: Create User Wallet Summary projector (Read Model)

**Files:**

- Create: `apps/api/src/modules/user/application/projections/user-wallet-summary.projector.ts`

**Step 1: Write the projector test**

Create `apps/api/src/modules/user/application/projections/__tests__/user-wallet-summary.projector.spec.ts`:

```typescript
import { UserWalletSummaryProjector } from "../user-wallet-summary.projector";
import { UserCreatedDomainEvent } from "@modules/user/domain/events/user-created.domain-event";
import { WalletCreatedDomainEvent } from "@modules/wallet/domain/events/wallet-created.domain-event";

describe("UserWalletSummaryProjector", () => {
  let projector: UserWalletSummaryProjector;
  let mockPool: { query: jest.Mock };

  beforeEach(() => {
    mockPool = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    };
    projector = new UserWalletSummaryProjector(mockPool as any);
  });

  it("projects user created event", async () => {
    const event = new UserCreatedDomainEvent({
      aggregateId: "user-1",
      email: "test@example.com",
      country: "England",
      postalCode: "28566",
      street: "Grand Avenue",
    });

    await projector.onUserCreated(event);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it("projects wallet created event", async () => {
    const event = new WalletCreatedDomainEvent({
      aggregateId: "wallet-1",
      userId: "user-1",
    });

    await projector.onWalletCreated(event);
    expect(mockPool.query).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/user/application/projections/__tests__/user-wallet-summary.projector.spec.ts`
Expected: FAIL — cannot find module

**Step 3: Implement the projector**

Create `apps/api/src/modules/user/application/projections/user-wallet-summary.projector.ts`:

```typescript
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { z } from "zod";
import { UserCreatedDomainEvent } from "@modules/user/domain/events/user-created.domain-event";
import { WalletCreatedDomainEvent } from "@modules/wallet/domain/events/wallet-created.domain-event";

const userWalletSummarySchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  userId: z.string(),
  email: z.string().nullable(),
  country: z.string().nullable(),
  walletId: z.string().nullable(),
  balance: z.number().int().nullable(),
});

@Injectable()
export class UserWalletSummaryProjector {
  private readonly logger = new Logger(UserWalletSummaryProjector.name);

  constructor(
    @InjectPool()
    private readonly pool: DatabasePool,
  ) {}

  @OnEvent(UserCreatedDomainEvent.name, { async: true, promisify: true })
  async onUserCreated(event: UserCreatedDomainEvent): Promise<void> {
    this.logger.log(`Projecting user created: ${event.aggregateId}`);
    await this.pool.query(sql.type(userWalletSummarySchema)`
      INSERT INTO "user_wallet_summary" ("id", "userId", "email", "country")
      VALUES (${event.aggregateId}, ${event.aggregateId}, ${event.email}, ${event.country})
      ON CONFLICT ("userId") DO UPDATE SET
        "email" = ${event.email},
        "country" = ${event.country},
        "updatedAt" = now()
    `);
  }

  @OnEvent(WalletCreatedDomainEvent.name, { async: true, promisify: true })
  async onWalletCreated(event: WalletCreatedDomainEvent): Promise<void> {
    this.logger.log(
      `Projecting wallet created: ${event.aggregateId} for user ${event.userId}`,
    );
    await this.pool.query(sql.type(userWalletSummarySchema)`
      UPDATE "user_wallet_summary" SET
        "walletId" = ${event.aggregateId},
        "balance" = 0,
        "updatedAt" = now()
      WHERE "userId" = ${event.userId}
    `);
  }
}
```

**Step 4: Run tests**

Run: `cd apps/api && npx jest --config .jestrc.json src/modules/user/application/projections/__tests__/user-wallet-summary.projector.spec.ts`
Expected: PASS

**Step 5: Register projector in UserModule**

Add `UserWalletSummaryProjector` to providers in `user.module.ts`.

**Step 6: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 7: Commit**

```bash
git add apps/api/src/modules/user/application/projections/ apps/api/src/modules/user/user.module.ts
git commit -m "feat(user): add UserWalletSummaryProjector read model"
```

---

### Task 25: Create User Wallet Summary query

**Files:**

- Create: `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.query-handler.ts`
- Create: `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.http.controller.ts`
- Create: `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.request.dto.ts`

**Step 1: Create the query handler**

Create `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.query-handler.ts`:

```typescript
import { QueryHandler } from "@nestjs/cqrs";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { ok, Result } from "neverthrow";
import { QueryBase, Paginated, PaginatedQueryBase } from "@repo/core";
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

export class FindUserWalletSummaryQuery extends QueryBase {
  readonly userId: string;

  constructor(props: { userId: string }) {
    super();
    this.userId = props.userId;
  }
}

@QueryHandler(FindUserWalletSummaryQuery)
export class FindUserWalletSummaryQueryHandler {
  constructor(
    @InjectPool()
    private readonly pool: DatabasePool,
  ) {}

  async execute(
    query: FindUserWalletSummaryQuery,
  ): Promise<Result<UserWalletSummaryReadModel | null, Error>> {
    const result = await this.pool.maybeOne(
      sql.type(userWalletSummaryReadSchema)`
        SELECT * FROM "user_wallet_summary" WHERE "userId" = ${query.userId}
      `,
    );
    return ok(result ?? null);
  }
}
```

**Step 2: Create request DTO**

Create `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.request.dto.ts`:

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class FindUserWalletSummaryRequestDto {
  @ApiProperty({
    example: "2cdc8ab1-6d50-49cc-ba14-54e4ac7ec231",
    description: "User ID to lookup summary for",
  })
  @IsUUID()
  readonly userId: string;
}
```

**Step 3: Create HTTP controller**

Create `apps/api/src/modules/user/queries/find-user-wallet-summary/find-user-wallet-summary.http.controller.ts`:

```typescript
import {
  Controller,
  Get,
  HttpStatus,
  Param,
  NotFoundException as NotFoundHttpException,
} from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Result } from "neverthrow";
import { routesV1 } from "@config/app.routes";
import {
  FindUserWalletSummaryQuery,
  UserWalletSummaryReadModel,
} from "./find-user-wallet-summary.query-handler";

@Controller(routesV1.version)
export class FindUserWalletSummaryHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(`${routesV1.user.root}/:id/wallet-summary`)
  @ApiOperation({ summary: "Get user wallet summary (read model)" })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findSummary(
    @Param("id") userId: string,
  ): Promise<UserWalletSummaryReadModel> {
    const result: Result<UserWalletSummaryReadModel | null, Error> =
      await this.queryBus.execute(new FindUserWalletSummaryQuery({ userId }));

    return result.match(
      (data) => {
        if (!data)
          throw new NotFoundHttpException("User wallet summary not found");
        return data;
      },
      (error) => {
        throw error;
      },
    );
  }
}
```

**Step 4: Register in UserModule**

Add `FindUserWalletSummaryQueryHandler` to `queryHandlers` and `FindUserWalletSummaryHttpController` to `httpControllers` in `user.module.ts`.

**Step 5: Verify build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 6: Commit**

```bash
git add apps/api/src/modules/user/queries/find-user-wallet-summary/ apps/api/src/modules/user/user.module.ts
git commit -m "feat(user): add FindUserWalletSummary query reading from projection"
```

---

### Task 26: Update NEXT_STEPS.md and run final validation

**Files:**

- Modify: `NEXT_STEPS.md`

**Step 1: Mark Phase 4 items as complete**

Update all `- [ ]` items in Phase 4 of `NEXT_STEPS.md` to `- [x]`.

**Step 2: Run full test suite**

Run: `cd apps/api && pnpm test`
Expected: All tests pass

**Step 3: Run dependency validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: No violations

**Step 4: Run build**

Run: `pnpm build`
Expected: BUILD SUCCESS

**Step 5: Run lint**

Run: `pnpm lint`
Expected: No errors

**Step 6: Commit**

```bash
git add NEXT_STEPS.md
git commit -m "docs: mark Phase 4 items as complete in NEXT_STEPS.md"
```

---

## Implementation Order Summary

| Task | Component                                    | Type        |
| ---- | -------------------------------------------- | ----------- |
| 1    | Install OTel packages                        | Setup       |
| 2    | OTel bootstrap (tracing.ts)                  | Feature     |
| 3    | Integrate OTel with main.ts                  | Feature     |
| 4    | Enrich Pino logs with trace context          | Feature     |
| 5    | Docker observability infrastructure          | Infra       |
| 6    | OTel environment variables                   | Config      |
| 7    | Install graphql-armor                        | Setup       |
| 8    | Configure graphql-armor                      | Feature     |
| 9    | Install JWT auth packages                    | Setup       |
| 10   | Create JWT auth infrastructure               | Feature     |
| 11   | Register auth module + guards                | Feature     |
| 12   | GraphQL error formatter                      | Feature     |
| 13   | Circular dependency detection                | Config      |
| 14   | Cross-module import prevention               | Config      |
| 15   | Module boundaries docs                       | Docs        |
| 16   | DB migrations (sagas + read model)           | DB          |
| 17   | Wallet domain errors + FundsTransferredEvent | Domain      |
| 18   | TransferFunds domain service (TDD)           | Domain      |
| 19   | TransferFunds command handler (BDD)          | Application |
| 20   | TransferFunds HTTP controller                | API         |
| 21   | UserRegistrationSaga entity                  | Domain      |
| 22   | Saga repository + mapper                     | Infra       |
| 23   | Saga event handlers                          | Application |
| 24   | UserWalletSummary projector                  | Application |
| 25   | UserWalletSummary query + controller         | API         |
| 26   | Final validation + NEXT_STEPS update         | Validation  |
