# Turborepo Monorepo Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert single-package NestJS DDD app into a pnpm monorepo with Turborepo, moving the app to `apps/api/` and extracting shared libs to `packages/core/`.

**Architecture:** pnpm workspaces with Turborepo orchestration. The NestJS app lives in `apps/api/`, the shared DDD/infrastructure code lives in `packages/core/` as `@repo/core`. TypeScript project references connect them.

**Tech Stack:** pnpm, Turborepo v2, TypeScript, NestJS

**Design Doc:** `docs/plans/2026-03-04-turborepo-monorepo-design.md`

---

### Task 1: Install pnpm and initialize workspace root

**Files:**
- Modify: `package.json` (root — becomes workspace root)
- Create: `pnpm-workspace.yaml`

**Step 1: Install pnpm globally (if not already installed)**

Run: `npm install -g pnpm`
Expected: pnpm installed successfully

**Step 2: Create `pnpm-workspace.yaml`**

Create file at repo root:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Rewrite root `package.json` as workspace root**

Replace the current root `package.json` with a minimal workspace root. All app-specific deps will move to `apps/api/package.json` in Task 3.

```json
{
  "name": "domain-driven-hexagon",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "format": "turbo run format",
    "dev": "turbo run start:dev"
  },
  "devDependencies": {
    "turbo": "^2"
  },
  "packageManager": "pnpm@9.15.4",
  "volta": {
    "node": "20.1.0"
  }
}
```

**Step 4: Commit**

```bash
git add pnpm-workspace.yaml package.json
git commit -m "chore: initialize pnpm workspace root with Turborepo"
```

---

### Task 2: Create directory structure and move files

**Files:**
- Move: `src/` → `apps/api/src/` (minus `src/libs/`)
- Move: `tests/` → `apps/api/tests/`
- Move: `database/` → `apps/api/database/`
- Move: `docker/` → `apps/api/docker/`
- Move: `src/libs/` → `packages/core/src/`
- Move: config files to `apps/api/`

**Step 1: Create directory structure**

```bash
mkdir -p apps/api
mkdir -p packages/core/src
```

**Step 2: Move libs to packages/core**

```bash
# Move all libs subdirectories to packages/core/src/
mv src/libs/api packages/core/src/api
mv src/libs/application packages/core/src/application
mv src/libs/db packages/core/src/db
mv src/libs/ddd packages/core/src/ddd
mv src/libs/decorators packages/core/src/decorators
mv src/libs/exceptions packages/core/src/exceptions
mv src/libs/ports packages/core/src/ports
mv src/libs/types packages/core/src/types
mv src/libs/utils packages/core/src/utils
mv src/libs/guard.ts packages/core/src/guard.ts
rmdir src/libs
```

**Step 3: Move NestJS app to apps/api**

```bash
# Move source and test files
mv src apps/api/src
mv tests apps/api/tests
mv database apps/api/database
mv docker apps/api/docker
mv assets apps/api/assets

# Move config files
mv nest-cli.json apps/api/
mv .jestrc.json apps/api/
mv jest-e2e.json apps/api/
mv tsconfig.json apps/api/
mv tsconfig.build.json apps/api/
mv .eslintrc.js apps/api/
mv .prettierrc apps/api/
mv .dependency-cruiser.js apps/api/
mv .env.example apps/api/
mv .env.test apps/api/
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: move app to apps/api/ and libs to packages/core/"
```

---

### Task 3: Create packages/core package

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`

**Step 1: Create `packages/core/package.json`**

```json
{
  "name": "@repo/core",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --build",
    "lint": "echo 'no lint configured yet'"
  },
  "dependencies": {
    "@nestjs/common": "^9.0.0",
    "@nestjs/core": "^9.0.0",
    "@nestjs/cqrs": "^9.0.1",
    "@nestjs/swagger": "^6.1.2",
    "class-validator": "^0.13.2",
    "dotenv": "^16.0.2",
    "nanoid": "^3.3.4",
    "nestjs-request-context": "^2.1.0",
    "nestjs-slonik": "^9.0.0",
    "oxide.ts": "^1.0.5",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.2.0",
    "slonik": "^31.2.4",
    "zod": "^3.21.4"
  },
  "devDependencies": {
    "typescript": "^4.7.4"
  }
}
```

Note: These deps are the subset from the original `package.json` that `src/libs/` actually uses. The key ones are `@nestjs/common` (for decorators, HTTP exceptions in interceptor), `slonik` (for sql-repository.base), `nestjs-request-context`, `oxide.ts`, `zod`, `nanoid`.

**Step 2: Create `packages/core/src/index.ts` barrel export**

This file re-exports everything that modules import from libs. Based on the import analysis:

```ts
// DDD
export * from './ddd';

// Exceptions
export * from './exceptions';

// Decorators
export * from './decorators';

// Types
export * from './types';

// Utils
export * from './utils';

// API
export { ResponseBase } from './api/response.base';
export { IdResponse } from './api/id.response.dto';
export { PaginatedResponseDto } from './api/paginated.response.base';
export { PaginatedQueryRequestDto } from './api/paginated-query.request.dto';
export { ApiErrorResponse } from './api/api-error.response';
export { PaginatedGraphqlResponse } from './api/graphql/paginated.graphql-response.base';

// Application
export { RequestContextService } from './application/context/AppRequestContext';
export { ContextInterceptor } from './application/context/ContextInterceptor';
export { ExceptionInterceptor } from './application/interceptors/exception.interceptor';

// Database
export { SqlRepositoryBase } from './db/sql-repository.base';

// Ports
export { LoggerPort } from './ports/logger.port';

// Guard
export { Guard } from './guard';
```

**Step 3: Create `packages/core/tsconfig.json`**

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "strictPropertyInitialization": false,
    "target": "es2019",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "composite": true,
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"]
}
```

**Step 4: Fix internal @libs/ imports within packages/core**

Files inside `packages/core/src/` still use `@libs/...` to import each other. These must become relative imports since there's no `@libs` alias inside this package.

Files to update (change `@libs/` to relative `./` or `../`):

- `packages/core/src/ddd/command.base.ts`: `@libs/application/context/AppRequestContext` → `../application/context/AppRequestContext`
- `packages/core/src/ddd/domain-event.base.ts`: `@libs/application/context/AppRequestContext` → `../application/context/AppRequestContext`
- `packages/core/src/ddd/aggregate-root.base.ts`: `@libs/ports/logger.port` → `../ports/logger.port`
- `packages/core/src/db/sql-repository.base.ts`:
  - `@libs/application/context/AppRequestContext` → `../application/context/AppRequestContext`
  - `@libs/ddd` → `../ddd`
  - `@libs/ddd` (Mapper) → `../ddd`
  - `@libs/ddd` (RepositoryPort) → `../ddd`
  - `@libs/exceptions` → `../exceptions`
- `packages/core/src/application/interceptors/exception.interceptor.ts`:
  - `@libs/exceptions` → `../../exceptions`
  - `@src/libs/api/api-error.response` → `../../api/api-error.response`
- `packages/core/src/exceptions/exception.base.ts`: `@libs/application/context/AppRequestContext` → `../application/context/AppRequestContext`

**Step 5: Commit**

```bash
git add packages/core/
git commit -m "chore: create @repo/core package with barrel exports"
```

---

### Task 4: Create apps/api package

**Files:**
- Create: `apps/api/package.json`
- Modify: `apps/api/tsconfig.json`
- Modify: `apps/api/tsconfig.build.json`
- Modify: `apps/api/nest-cli.json`

**Step 1: Create `apps/api/package.json`**

This gets all the NestJS deps from the original root `package.json`, plus `@repo/core` as a workspace dep:

```json
{
  "name": "@repo/api",
  "version": "2.0.0",
  "private": true,
  "scripts": {
    "prebuild": "rimraf dist",
    "build": "nest build",
    "format": "prettier --write \"src/**/*.ts\" \"tests/**/*.ts\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"{src,tests}/**/*.ts\" --fix",
    "test": "jest --config .jestrc.json",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest -i --config jest-e2e.json",
    "docker:env": "docker-compose --file docker/docker-compose.yml up --build",
    "migration:create": "ts-node database/migrate create --name",
    "migration:up": "ts-node database/migrate up",
    "migration:up:tests": "NODE_ENV=test ts-node database/migrate up",
    "migration:down": "ts-node database/migrate down",
    "migration:down:tests": "NODE_ENV=test ts-node database/migrate down",
    "migration:executed": "ts-node database/migrate executed",
    "migration:executed:tests": "NODE_ENV=test ts-node database/migrate executed",
    "migration:pending": "ts-node database/migrate pending",
    "migration:pending:tests": "NODE_ENV=test ts-node database/migrate pending",
    "seed:up": "ts-node database/seed",
    "depcruise": "depcruise",
    "deps:validate": "depcruise src --config .dependency-cruiser.js --output-type err-long",
    "deps:graph": "depcruise src --include-only \"^src\" --config --output-type dot | dot -T svg > assets/dependency-graph.svg"
  },
  "dependencies": {
    "@nestjs/apollo": "^10.1.3",
    "@nestjs/common": "^9.0.0",
    "@nestjs/core": "^9.0.0",
    "@nestjs/cqrs": "^9.0.1",
    "@nestjs/event-emitter": "^1.3.1",
    "@nestjs/graphql": "^10.1.2",
    "@nestjs/microservices": "^9.1.2",
    "@nestjs/platform-express": "^9.0.0",
    "@nestjs/swagger": "^6.1.2",
    "@repo/core": "workspace:*",
    "@slonik/migrator": "^0.11.3",
    "apollo-server-core": "^3.10.2",
    "apollo-server-express": "^3.10.2",
    "class-transformer": "^0.5.1",
    "class-validator": "^0.13.2",
    "dotenv": "^16.0.2",
    "env-var": "^7.3.0",
    "graphql": "^16.6.0",
    "jest-cucumber": "^3.0.1",
    "nanoid": "^3.3.4",
    "nestjs-console": "^8.0.0",
    "nestjs-request-context": "^2.1.0",
    "nestjs-slonik": "^9.0.0",
    "oxide.ts": "^1.0.5",
    "reflect-metadata": "^0.1.13",
    "rimraf": "^3.0.2",
    "rxjs": "^7.2.0",
    "slonik": "^31.2.4",
    "uuid": "^9.0.0",
    "zod": "^3.21.4"
  },
  "devDependencies": {
    "@nestjs/cli": "^9.0.0",
    "@nestjs/schematics": "^9.0.0",
    "@nestjs/testing": "^9.0.0",
    "@types/express": "^4.17.13",
    "@types/jest": "28.1.8",
    "@types/node": "^16.0.0",
    "@types/supertest": "^2.0.11",
    "@types/uuid": "^8.3.4",
    "@typescript-eslint/eslint-plugin": "^5.0.0",
    "@typescript-eslint/parser": "^5.0.0",
    "dependency-cruiser": "^12.10.0",
    "eslint": "^8.0.1",
    "eslint-config-prettier": "^8.3.0",
    "eslint-plugin-prettier": "^4.0.0",
    "jest": "28.1.3",
    "prettier": "^2.3.2",
    "source-map-support": "^0.5.20",
    "supertest": "^6.1.3",
    "ts-jest": "28.0.8",
    "ts-loader": "^9.2.3",
    "ts-node": "^10.0.0",
    "tsconfig-paths": "4.1.0",
    "typescript": "^4.7.4"
  }
}
```

**Step 2: Update `apps/api/tsconfig.json`**

The path aliases need updating. `@libs/*` is removed (replaced by `@repo/core` package). Other aliases are adjusted for the new `baseUrl`.

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "strictPropertyInitialization": false,
    "target": "es2019",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false,
    "paths": {
      "@src/*": ["src/*"],
      "@modules/*": ["src/modules/*"],
      "@config/*": ["src/configs/*"],
      "@tests/*": ["tests/*"]
    }
  }
}
```

Note: `@libs/*` path alias is **removed** — all libs imports now go through `@repo/core` package.

**Step 3: Update `apps/api/tsconfig.build.json`**

No change needed — it extends `./tsconfig.json` which is now at `apps/api/tsconfig.json`.

**Step 4: Update `apps/api/nest-cli.json`**

No change needed — `sourceRoot: "src"` is relative and still correct.

**Step 5: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json
git commit -m "chore: create @repo/api package with workspace dep on @repo/core"
```

---

### Task 5: Migrate imports in apps/api

**Files:**
- Modify: All files in `apps/api/src/` that import from `@libs/`, `@src/libs/`, `../libs/`, `./libs/`
- Modify: All files in `apps/api/tests/` that import from `@src/libs/`

This is the largest task. Every import from libs must change to `@repo/core`.

**Step 1: Replace `@libs/` imports in app source**

For each file listed below, replace imports from `@libs/...` with `@repo/core`:

**`apps/api/src/app.module.ts`** (2 imports):
```ts
// BEFORE:
import { ContextInterceptor } from './libs/application/context/ContextInterceptor';
import { ExceptionInterceptor } from '@libs/application/interceptors/exception.interceptor';

// AFTER:
import { ContextInterceptor, ExceptionInterceptor } from '@repo/core';
```

**`apps/api/src/modules/user/domain/user.entity.ts`**:
```ts
// BEFORE:
import { AggregateRoot, AggregateID } from '@libs/ddd';
// AFTER:
import { AggregateRoot, AggregateID } from '@repo/core';
```

**`apps/api/src/modules/user/domain/user.errors.ts`**:
```ts
// BEFORE:
import { ExceptionBase } from '@libs/exceptions';
// AFTER:
import { ExceptionBase } from '@repo/core';
```

**`apps/api/src/modules/user/domain/value-objects/address.value-object.ts`**:
```ts
// BEFORE:
import { ValueObject } from '@libs/ddd';
import { Guard } from '@libs/guard';
import { ArgumentOutOfRangeException } from '@libs/exceptions';
// AFTER:
import { ValueObject, Guard, ArgumentOutOfRangeException } from '@repo/core';
```

**`apps/api/src/modules/user/domain/events/user-created.domain-event.ts`**:
```ts
// BEFORE:
import { DomainEvent, DomainEventProps } from '@libs/ddd';
// AFTER:
import { DomainEvent, DomainEventProps } from '@repo/core';
```

**`apps/api/src/modules/user/domain/events/user-deleted.domain-event.ts`**:
```ts
// BEFORE:
import { DomainEvent, DomainEventProps } from '@libs/ddd';
// AFTER:
import { DomainEvent, DomainEventProps } from '@repo/core';
```

**`apps/api/src/modules/user/domain/events/user-role-changed.domain-event.ts`**:
```ts
// BEFORE:
import { DomainEvent, DomainEventProps } from '@libs/ddd';
// AFTER:
import { DomainEvent, DomainEventProps } from '@repo/core';
```

**`apps/api/src/modules/user/domain/events/user-address-updated.domain-event.ts`**:
```ts
// BEFORE:
import { DomainEvent, DomainEventProps } from '@libs/ddd';
// AFTER:
import { DomainEvent, DomainEventProps } from '@repo/core';
```

**`apps/api/src/modules/user/database/user.repository.port.ts`**:
```ts
// BEFORE:
import { PaginatedQueryParams, RepositoryPort } from '@libs/ddd';
// AFTER:
import { PaginatedQueryParams, RepositoryPort } from '@repo/core';
```

**`apps/api/src/modules/user/database/user.repository.ts`**:
```ts
// BEFORE:
import { SqlRepositoryBase } from '@src/libs/db/sql-repository.base';
// AFTER:
import { SqlRepositoryBase } from '@repo/core';
```

**`apps/api/src/modules/user/user.mapper.ts`**:
```ts
// BEFORE:
import { Mapper } from '@libs/ddd';
// AFTER:
import { Mapper } from '@repo/core';
```

**`apps/api/src/modules/user/dtos/user.response.dto.ts`**:
```ts
// BEFORE:
import { ResponseBase } from '@libs/api/response.base';
// AFTER:
import { ResponseBase } from '@repo/core';
```

**`apps/api/src/modules/user/dtos/user.paginated.response.dto.ts`**:
```ts
// BEFORE:
import { PaginatedResponseDto } from '@src/libs/api/paginated.response.base';
// AFTER:
import { PaginatedResponseDto } from '@repo/core';
```

**`apps/api/src/modules/user/dtos/graphql/user.graphql-response.dto.ts`**:
```ts
// BEFORE:
import { ResponseBase } from '@libs/api/response.base';
// AFTER:
import { ResponseBase } from '@repo/core';
```

**`apps/api/src/modules/user/dtos/graphql/user.paginated-gql-response.dto.ts`**:
```ts
// BEFORE:
import { PaginatedGraphqlResponse } from '../../../../libs/api/graphql/paginated.graphql-response.base';
// AFTER:
import { PaginatedGraphqlResponse } from '@repo/core';
```

**`apps/api/src/modules/user/commands/create-user/create-user.command.ts`**:
```ts
// BEFORE:
import { Command, CommandProps } from '@libs/ddd';
// AFTER:
import { Command, CommandProps } from '@repo/core';
```

**`apps/api/src/modules/user/commands/create-user/create-user.service.ts`**:
```ts
// BEFORE:
import { AggregateID } from '@libs/ddd';
import { ConflictException } from '@libs/exceptions';
// AFTER:
import { AggregateID, ConflictException } from '@repo/core';
```

**`apps/api/src/modules/user/commands/create-user/create-user.http.controller.ts`**:
```ts
// BEFORE:
import { IdResponse } from '@libs/api/id.response.dto';
import { AggregateID } from '@libs/ddd';
import { ApiErrorResponse } from '@src/libs/api/api-error.response';
// AFTER:
import { IdResponse, AggregateID, ApiErrorResponse } from '@repo/core';
```

**`apps/api/src/modules/user/commands/create-user/create-user.message.controller.ts`**:
```ts
// BEFORE:
import { IdResponse } from '@libs/api/id.response.dto';
// AFTER:
import { IdResponse } from '@repo/core';
```

**`apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`**:
```ts
// BEFORE:
import { LoggerPort } from '@libs/ports/logger.port';
// AFTER:
import { LoggerPort } from '@repo/core';
```

**`apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts`**:
```ts
// BEFORE:
import { AggregateID } from '@src/libs/ddd';
// AFTER:
import { AggregateID } from '@repo/core';
```

**`apps/api/src/modules/user/commands/delete-user/delete-user.service.ts`**:
```ts
// BEFORE:
import { NotFoundException } from '@libs/exceptions';
// AFTER:
import { NotFoundException } from '@repo/core';
```

**`apps/api/src/modules/user/commands/delete-user/delete-user.http-controller.ts`**:
```ts
// BEFORE:
import { NotFoundException } from '@libs/exceptions';
import { ApiErrorResponse } from '@src/libs/api/api-error.response';
// AFTER:
import { NotFoundException, ApiErrorResponse } from '@repo/core';
```

**`apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts`**:
```ts
// BEFORE:
import { PaginatedParams, PaginatedQueryBase } from '@libs/ddd/query.base';
import { Paginated } from '@src/libs/ddd';
// AFTER:
import { PaginatedParams, PaginatedQueryBase, Paginated } from '@repo/core';
```

**`apps/api/src/modules/user/queries/find-users/find-users.http.controller.ts`**:
```ts
// BEFORE:
import { Paginated } from '@src/libs/ddd';
import { PaginatedQueryRequestDto } from '@src/libs/api/paginated-query.request.dto';
import { ResponseBase } from '@src/libs/api/response.base';
// AFTER:
import { Paginated, PaginatedQueryRequestDto, ResponseBase } from '@repo/core';
```

**`apps/api/src/modules/user/queries/find-users/find-users.graphql-resolver.ts`**:
```ts
// BEFORE:
import { ResponseBase } from '../../../../libs/api/response.base';
import { Paginated } from '../../../../libs/ddd';
import { PaginatedParams } from '../../../../libs/ddd/query.base';
// AFTER:
import { ResponseBase, Paginated, PaginatedParams } from '@repo/core';
```

**`apps/api/src/modules/wallet/domain/wallet.entity.ts`**:
```ts
// BEFORE:
import { AggregateID, AggregateRoot } from '@libs/ddd';
import { ArgumentOutOfRangeException } from '@libs/exceptions';
// AFTER:
import { AggregateID, AggregateRoot, ArgumentOutOfRangeException } from '@repo/core';
```

**`apps/api/src/modules/wallet/domain/wallet.errors.ts`**:
```ts
// BEFORE:
import { ExceptionBase } from '@libs/exceptions';
// AFTER:
import { ExceptionBase } from '@repo/core';
```

**`apps/api/src/modules/wallet/domain/events/wallet-created.domain-event.ts`**:
```ts
// BEFORE:
import { DomainEvent, DomainEventProps } from '@libs/ddd';
// AFTER:
import { DomainEvent, DomainEventProps } from '@repo/core';
```

**`apps/api/src/modules/wallet/database/wallet.repository.port.ts`**:
```ts
// BEFORE:
import { RepositoryPort } from '@libs/ddd';
// AFTER:
import { RepositoryPort } from '@repo/core';
```

**`apps/api/src/modules/wallet/database/wallet.repository.ts`**:
```ts
// BEFORE:
import { SqlRepositoryBase } from '@src/libs/db/sql-repository.base';
// AFTER:
import { SqlRepositoryBase } from '@repo/core';
```

**`apps/api/src/modules/wallet/wallet.mapper.ts`**:
```ts
// BEFORE:
import { Mapper } from '@libs/ddd';
// AFTER:
import { Mapper } from '@repo/core';
```

**Step 2: Replace libs imports in test files**

**`apps/api/tests/shared/shared-steps.ts`**:
```ts
// BEFORE:
import { ApiErrorResponse } from '@src/libs/api/api-error.response';
// AFTER:
import { ApiErrorResponse } from '@repo/core';
```

**`apps/api/tests/user/user-shared-steps.ts`**:
```ts
// BEFORE:
import { Mutable } from '@src/libs/types';
// AFTER:
import { Mutable } from '@repo/core';
```

**`apps/api/tests/user/delete-user/delete-user.e2e-spec.ts`**:
```ts
// BEFORE:
import { IdResponse } from '@src/libs/api/id.response.dto';
// AFTER:
import { IdResponse } from '@repo/core';
```

**`apps/api/tests/user/create-user/create-user.e2e-spec.ts`**:
```ts
// BEFORE:
import { IdResponse } from '@src/libs/api/id.response.dto';
// AFTER:
import { IdResponse } from '@repo/core';
```

**`apps/api/tests/test-utils/ApiClient.ts`**:
```ts
// BEFORE:
import { IdResponse } from '@src/libs/api/id.response.dto';
// AFTER:
import { IdResponse } from '@repo/core';
```

**Step 3: Fix database.config.ts relative import to dotenv**

**`apps/api/src/configs/database.config.ts`**:
```ts
// BEFORE:
import '../libs/utils/dotenv';
// AFTER:
import '@repo/core/src/utils/dotenv';
```

Note: Alternatively, you can move the dotenv initialization to the app's own entry point or a local util. The simplest fix for now is to import from `@repo/core/src/utils/dotenv` directly (subpath import).

**Step 4: Commit**

```bash
git add apps/api/
git commit -m "refactor: migrate all @libs imports to @repo/core"
```

---

### Task 6: Update Jest configs for new structure

**Files:**
- Modify: `apps/api/.jestrc.json`
- Modify: `apps/api/jest-e2e.json`

**Step 1: Update `apps/api/.jestrc.json`**

The `moduleNameMapper` must remove `@libs` (now resolved via `@repo/core` package) and keep other aliases adjusted:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "coverageDirectory": "./tests/coverage",
  "setupFilesAfterEnv": ["./tests/setup/jestSetupAfterEnv.ts"],
  "globalSetup": "<rootDir>/tests/setup/jestGlobalSetup.ts",
  "testRegex": ".spec.ts$",
  "moduleNameMapper": {
    "@src/(.*)$": "<rootDir>/src/$1",
    "@modules/(.*)$": "<rootDir>/src/modules/$1",
    "@config/(.*)$": "<rootDir>/src/configs/$1",
    "@tests/(.*)$": "<rootDir>/tests/$1",
    "@repo/core/src/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "@repo/core": "<rootDir>/../../packages/core/src/index.ts"
  },
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

**Step 2: Update `apps/api/jest-e2e.json`**

Same pattern:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "coverageDirectory": "./coverage",
  "setupFilesAfterEnv": ["./tests/setup/jestSetupAfterEnv.ts"],
  "globalSetup": "<rootDir>/tests/setup/jestGlobalSetup.ts",
  "testRegex": ".e2e-spec.ts$",
  "moduleNameMapper": {
    "@src/(.*)$": "<rootDir>/src/$1",
    "@modules/(.*)$": "<rootDir>/src/modules/$1",
    "@config/(.*)$": "<rootDir>/src/configs/$1",
    "@tests/(.*)$": "<rootDir>/tests/$1",
    "@repo/core/src/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "@repo/core": "<rootDir>/../../packages/core/src/index.ts"
  },
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

Note: The `@repo/core/src/(.*)$` mapping handles the `import '@repo/core/src/utils/dotenv'` subpath import from `database.config.ts`. The `@repo/core` mapping handles the barrel import.

**Step 3: Commit**

```bash
git add apps/api/.jestrc.json apps/api/jest-e2e.json
git commit -m "chore: update Jest configs for monorepo structure"
```

---

### Task 7: Create turbo.json and update .gitignore

**Files:**
- Create: `turbo.json` (repo root)
- Modify: `.gitignore`

**Step 1: Create `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "test:e2e": {
      "dependsOn": ["build"]
    },
    "format": {},
    "deps:validate": {},
    "start:dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Step 2: Update `.gitignore`**

Add Turborepo cache directory. Remove `/package-lock.json` (switching to pnpm). Keep everything else:

```gitignore
# Environment variables
.env

# compiled output
/dist
**/dist
/node_modules
**/node_modules

# Logs
logs
*.log
npm-debug.log*
pnpm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# OS
.DS_Store

# Tests
/coverage
/.nyc_output

# IDEs and editors
/.idea
.project
.classpath
.c9/
*.launch
.settings/
*.sublime-workspace

# IDE - VSCode
# .vscode/*
# !.vscode/settings.json
# !.vscode/tasks.json
# !.vscode/launch.json
# !.vscode/extensions.json

# Turborepo
.turbo/
```

**Step 3: Commit**

```bash
git add turbo.json .gitignore
git commit -m "chore: add turbo.json and update .gitignore for Turborepo"
```

---

### Task 8: Fix dotenv paths after directory move

**Files:**
- Modify: `packages/core/src/utils/dotenv.ts`
- Modify: `apps/api/database/getMigrator.ts`

**Step 1: Fix `packages/core/src/utils/dotenv.ts`**

The `__dirname` relative paths are now wrong because the file moved from `src/libs/utils/` to `packages/core/src/utils/`. The `.env` files live in `apps/api/`. Update the path resolution:

```ts
import { config } from 'dotenv';
import * as path from 'path';

// Initializing dotenv
// When running from apps/api (via ts-node or compiled), .env is at the app root
const envPath: string = path.resolve(
  process.cwd(),
  process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
);
config({ path: envPath });
```

Note: Switching from `__dirname` to `process.cwd()` because the dotenv file is now in a separate package. The app should always be run from its own directory (`apps/api/`), where `.env` files live. This is the standard monorepo pattern.

**Step 2: Fix `apps/api/database/getMigrator.ts`**

Same issue — `__dirname` paths for `.env` changed:

```ts
const envPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env',
);
```

This file is still inside `apps/api/database/`, so `../` still correctly points to `apps/api/`. No change needed for this file's `.env` resolution (it's one level up from `database/`). But check the migrations path:

```ts
migrationsPath: path.resolve(__dirname, 'migrations'),
```

This is still correct — migrations are at `apps/api/database/migrations/`.

**Step 3: Commit**

```bash
git add packages/core/src/utils/dotenv.ts apps/api/database/getMigrator.ts
git commit -m "fix: update dotenv path resolution for monorepo structure"
```

---

### Task 9: Install dependencies and verify

**Step 1: Run pnpm install from repo root**

```bash
pnpm install
```

Expected: pnpm resolves workspace dependencies, creates `pnpm-lock.yaml`, installs all deps.

**Step 2: Verify TypeScript compilation for @repo/core**

```bash
cd packages/core && pnpm exec tsc --noEmit
```

Expected: No compilation errors (all internal imports resolve correctly).

**Step 3: Verify TypeScript compilation for @repo/api**

```bash
cd apps/api && pnpm exec tsc --noEmit
```

Expected: No compilation errors (all `@repo/core` imports resolve, all `@modules/*`, `@config/*`, `@src/*` aliases work).

**Step 4: Run build via Turborepo**

```bash
pnpm build
```

Expected: Turborepo builds `@repo/core` first, then `@repo/api`. Both succeed.

**Step 5: Run unit tests**

```bash
pnpm test
```

Expected: All unit tests pass (Jest resolves `@repo/core` via `moduleNameMapper`).

**Step 6: Commit lock file**

```bash
git add pnpm-lock.yaml
git commit -m "chore: add pnpm-lock.yaml"
```

---

### Task 10: Clean up root-level files that were moved

**Step 1: Verify no orphaned files at root**

Check that none of the moved config files remain at root:

```bash
ls -la *.json *.js .prettierrc .env* 2>/dev/null
```

Expected: Only `package.json`, `turbo.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml` at root.

**Step 2: Remove any remaining old files if git didn't handle them**

The `git mv` or `mv` + `git add -A` in Task 2 should have handled this. Verify with `git status`.

**Step 3: Move README.md and LICENSE to root (they should stay at root)**

If `README.md` and `LICENSE` were moved to `apps/api/` in Task 2, move them back:

```bash
mv apps/api/README.md . 2>/dev/null
mv apps/api/LICENSE . 2>/dev/null
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: clean up root directory after monorepo migration"
```

---

### Summary of import migration patterns

| Old pattern | New pattern |
|---|---|
| `@libs/ddd` | `@repo/core` |
| `@libs/exceptions` | `@repo/core` |
| `@libs/api/response.base` | `@repo/core` |
| `@libs/ports/logger.port` | `@repo/core` |
| `@libs/guard` | `@repo/core` |
| `@libs/application/...` | `@repo/core` |
| `@src/libs/ddd` | `@repo/core` |
| `@src/libs/db/sql-repository.base` | `@repo/core` |
| `@src/libs/api/...` | `@repo/core` |
| `../../../../libs/...` (relative) | `@repo/core` |
| `./libs/...` (relative) | `@repo/core` |
| `../libs/utils/dotenv` | `@repo/core/src/utils/dotenv` |

All libs exports go through the `@repo/core` barrel `src/index.ts`. The only subpath import is `@repo/core/src/utils/dotenv` for side-effect-only dotenv initialization.
