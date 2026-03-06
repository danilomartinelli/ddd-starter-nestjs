# Dependency Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update all packages across the monorepo, replace deprecated libraries with modern alternatives, create a public nestjs-slonik package, and migrate from slonik-migrator to Flyway.

**Architecture:** Layered migration in 5 phases: (1) Tooling & Node, (2) NestJS v11, (3) GraphQL/Apollo, (4) Database (slonik v48 + new nestjs-slonik package + Flyway), (5) Libraries (neverthrow, uuid, zod v4). Each layer is independently testable and committable.

**Tech Stack:** NestJS 11, TypeScript 5.9, Slonik 48, Apollo Server 5, Zod 4, neverthrow, Flyway, ESLint 10 (flat config), Jest 29, Prettier 3

---

## Layer 1: Tooling & Node

### Task 1: Update Node.js version via Volta

**Files:**
- Modify: `package.json` (root)

**Step 1: Update Volta pin**

In `package.json` (root), change:
```json
"volta": {
  "node": "22.14.0"
}
```

**Step 2: Verify Node version**

Run: `node -v`
Expected: v22.x.x

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: bump Node.js to 22 LTS via Volta"
```

---

### Task 2: Update TypeScript to v5.9

**Files:**
- Modify: `packages/core/package.json` (devDependencies.typescript)
- Modify: `apps/api/package.json` (devDependencies.typescript)
- Modify: `packages/core/tsconfig.json` (target)
- Modify: `apps/api/tsconfig.json` (target)

**Step 1: Update TypeScript in both packages**

Run:
```bash
cd /Users/danilomartinelli/Workspace/github.com/danilomartinelli/domain-driven-hexagon-v2
pnpm --filter @repo/core add -D typescript@^5.9
pnpm --filter @repo/api add -D typescript@^5.9
```

**Step 2: Update tsconfig targets to es2022**

In `packages/core/tsconfig.json`, change `"target": "es2019"` to `"target": "es2022"`.

In `apps/api/tsconfig.json`, change `"target": "es2019"` to `"target": "es2022"`.

**Step 3: Verify build**

Run: `pnpm turbo build`
Expected: Both packages compile successfully.

Fix any TypeScript 5.x compilation errors if they appear. Common issues:
- `@typescript-eslint` rules may conflict (will be updated in Task 3)
- Decorator metadata should still work with `experimentalDecorators: true`

**Step 4: Commit**

```bash
git add packages/core/package.json packages/core/tsconfig.json apps/api/package.json apps/api/tsconfig.json pnpm-lock.yaml
git commit -m "chore: upgrade TypeScript to v5.9, target es2022"
```

---

### Task 3: Update ESLint to v10 with flat config

**Files:**
- Modify: `apps/api/package.json` (devDependencies)
- Delete: `apps/api/.eslintrc.js`
- Create: `apps/api/eslint.config.mjs`

**Step 1: Install new ESLint packages**

Run:
```bash
pnpm --filter @repo/api remove eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-config-prettier eslint-plugin-prettier
pnpm --filter @repo/api add -D eslint@^10 @typescript-eslint/eslint-plugin@^8 @typescript-eslint/parser@^8 eslint-config-prettier@^10 eslint-plugin-prettier@^5
```

**Step 2: Create flat config file**

Delete `apps/api/.eslintrc.js`.

Create `apps/api/eslint.config.mjs` with:

```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      'class-methods-use-this': 'off',
      'no-useless-constructor': 'off',
      'no-control-regex': 'off',
      'no-shadow': 'off',
      'consistent-return': 'off',
      'no-underscore-dangle': 'off',
      'max-classes-per-file': 'off',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'LabeledStatement',
          message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.',
        },
        {
          selector: 'WithStatement',
          message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.',
        },
        {
          selector: "MethodDefinition[kind='set']",
          message: 'Property setters are not allowed',
        },
      ],
    },
  },
];
```

**Step 3: Update lint script if needed**

The lint script `eslint "{src,tests}/**/*.ts" --fix` should still work with ESLint 10.

**Step 4: Verify lint runs**

Run: `pnpm --filter @repo/api lint`
Expected: Lint passes (or only style warnings, no config errors).

**Step 5: Commit**

```bash
git add apps/api/eslint.config.mjs apps/api/package.json pnpm-lock.yaml
git rm apps/api/.eslintrc.js
git commit -m "chore: migrate ESLint to v10 with flat config"
```

---

### Task 4: Update Prettier to v3

**Files:**
- Modify: `apps/api/package.json` (devDependencies.prettier)

**Step 1: Install Prettier v3**

Run:
```bash
pnpm --filter @repo/api add -D prettier@^3
```

**Step 2: Reformat code**

Run: `pnpm --filter @repo/api format`

Note: Prettier v3 changes trailing comma default to `all`. This may cause formatting changes. That's expected.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: upgrade Prettier to v3, reformat code"
```

---

### Task 5: Update Jest and testing dependencies

**Files:**
- Modify: `apps/api/package.json` (jest, ts-jest, @types/jest, supertest, @types/supertest)

**Step 1: Install updated testing packages**

Run:
```bash
pnpm --filter @repo/api add -D jest@^29 ts-jest@^29 @types/jest@^29 supertest@^7 @types/supertest@^6
pnpm --filter @repo/api remove source-map-support
```

**Step 2: Update Jest config if needed**

The `.jestrc.json` and `jest-e2e.json` should work as-is with Jest 29. The `transform` config `"^.+\\.(t|j)s$": "ts-jest"` is compatible.

**Step 3: Verify tests compile**

Run: `pnpm --filter @repo/api run test -- --passWithNoTests`

Note: Tests may fail if no database is running — that's fine. We're verifying the test runner itself starts without errors.

**Step 4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: upgrade Jest to v29, supertest to v7, remove source-map-support"
```

---

### Task 6: Update remaining tooling deps

**Files:**
- Modify: `apps/api/package.json` (rimraf, dependency-cruiser, @types/node, @types/express, ts-loader, tsconfig-paths)

**Step 1: Update packages**

Run:
```bash
pnpm --filter @repo/api add -D rimraf@^6 dependency-cruiser@^17 @types/node@^22 @types/express@^5 ts-loader@^9 tsconfig-paths@^4
```

Note: `@types/uuid` can be removed since uuid v11 ships its own types:
```bash
pnpm --filter @repo/api remove @types/uuid
```

**Step 2: Verify build**

Run: `pnpm turbo build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: update tooling deps (rimraf, dependency-cruiser, @types/*)"
```

---

## Layer 2: NestJS Framework

### Task 7: Upgrade NestJS to v11 in packages/core

**Files:**
- Modify: `packages/core/package.json`

**Step 1: Update NestJS packages in core**

Run:
```bash
pnpm --filter @repo/core add @nestjs/common@^11 @nestjs/core@^11 @nestjs/cqrs@^11 @nestjs/event-emitter@^3 @nestjs/graphql@^13 @nestjs/swagger@^11 nestjs-request-context@^4 reflect-metadata@^0.2
```

**Step 2: Verify build**

Run: `pnpm --filter @repo/core build`

Fix any compilation errors. Common issues:
- `@nestjs/swagger` v11 may have changed decorator APIs
- `@nestjs/event-emitter` v3 may have changed `EventEmitter2` imports
- `reflect-metadata` v0.2 should be backwards compatible

**Step 3: Commit**

```bash
git add packages/core/package.json pnpm-lock.yaml
git commit -m "chore: upgrade NestJS to v11 in @repo/core"
```

---

### Task 8: Upgrade NestJS to v11 in apps/api

**Files:**
- Modify: `apps/api/package.json`

**Step 1: Update NestJS packages in api**

Run:
```bash
pnpm --filter @repo/api add @nestjs/common@^11 @nestjs/core@^11 @nestjs/cqrs@^11 @nestjs/event-emitter@^3 @nestjs/platform-express@^11 @nestjs/microservices@^11 @nestjs/swagger@^11 nestjs-request-context@^4 reflect-metadata@^0.2
pnpm --filter @repo/api add -D @nestjs/cli@^11 @nestjs/schematics@^11 @nestjs/testing@^11
```

**Step 2: Verify build**

Run: `pnpm turbo build`

Fix Express v5 breaking changes if any:
- Route wildcards: `*` → `*path` (check `apps/api/src/configs/app.routes.ts` — the routes use named paths like `routesV1.user.root` and `routesV1.user.delete` which are simple string paths, not wildcards, so likely no changes needed)
- `ValidationPipe` should work the same

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: upgrade NestJS to v11 in @repo/api"
```

---

### Task 9: Remove nestjs-console and CLI controller

**Files:**
- Modify: `apps/api/package.json` (remove nestjs-console dep)
- Delete: `apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`
- Modify: `apps/api/src/modules/user/user.module.ts` (remove CLI controller)

**Step 1: Remove nestjs-console package**

Run:
```bash
pnpm --filter @repo/api remove nestjs-console
```

**Step 2: Delete CLI controller file**

Delete `apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`.

**Step 3: Update user.module.ts**

In `apps/api/src/modules/user/user.module.ts`:

Remove the import:
```typescript
import { CreateUserCliController } from './commands/create-user/create-user.cli.controller';
```

Remove the array:
```typescript
const cliControllers: Provider[] = [CreateUserCliController];
```

Remove `...cliControllers,` from the providers array.

**Step 4: Verify build**

Run: `pnpm turbo build`
Expected: Build succeeds without nestjs-console.

**Step 5: Commit**

```bash
git rm apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts
git add apps/api/src/modules/user/user.module.ts apps/api/package.json pnpm-lock.yaml
git commit -m "chore: remove nestjs-console (incompatible with NestJS 11)"
```

---

## Layer 3: GraphQL & Apollo

### Task 10: Upgrade Apollo Server and NestJS GraphQL

**Files:**
- Modify: `apps/api/package.json`

**Step 1: Remove deprecated Apollo packages, add new ones**

Run:
```bash
pnpm --filter @repo/api remove apollo-server-core apollo-server-express
pnpm --filter @repo/api add @apollo/server@^5 @nestjs/graphql@^13 @nestjs/apollo@^13 graphql@^16.13
```

**Step 2: Update app.module.ts if needed**

Check `apps/api/src/app.module.ts`. The current config already uses `ApolloDriver`:

```typescript
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
// ...
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
}),
```

This pattern is compatible with `@nestjs/apollo` v13 and `@apollo/server` v5. No code changes needed in `app.module.ts`.

**Step 3: Verify build**

Run: `pnpm turbo build`

If compilation errors appear, they'll likely be in:
- `apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts`
- `apps/api/src/modules/user/queries/find-users/find-users.graphql-resolver.ts`
- `apps/api/src/modules/user/dtos/graphql/*.ts`

The GraphQL decorators (`@Resolver`, `@Mutation`, `@Query`, `@Args`, `@Field`, `@ObjectType`, `@InputType`) come from `@nestjs/graphql` and should be API-compatible across v10→v13.

**Step 4: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "chore: upgrade to @apollo/server v5, @nestjs/graphql v13"
```

---

## Layer 4: Database

### Task 11: Create @danilomartinelli/nestjs-slonik package

**Files:**
- Create: `packages/nestjs-slonik/package.json`
- Create: `packages/nestjs-slonik/tsconfig.json`
- Create: `packages/nestjs-slonik/src/index.ts`
- Create: `packages/nestjs-slonik/src/slonik.constants.ts`
- Create: `packages/nestjs-slonik/src/slonik.interfaces.ts`
- Create: `packages/nestjs-slonik/src/slonik.decorators.ts`
- Create: `packages/nestjs-slonik/src/slonik.module.ts`

**Step 1: Create package directory**

```bash
mkdir -p packages/nestjs-slonik/src
```

**Step 2: Create package.json**

Create `packages/nestjs-slonik/package.json`:

```json
{
  "name": "@danilomartinelli/nestjs-slonik",
  "version": "1.0.0",
  "description": "NestJS module for Slonik PostgreSQL client",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc --build",
    "lint": "echo 'no lint configured yet'"
  },
  "peerDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "slonik": "^48.0.0"
  },
  "devDependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.0",
    "slonik": "^48.0.0",
    "typescript": "^5.9.0"
  }
}
```

**Step 3: Create tsconfig.json**

Create `packages/nestjs-slonik/tsconfig.json`:

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
    "target": "es2022",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "composite": true,
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true
  },
  "include": ["src/**/*"]
}
```

**Step 4: Create slonik.constants.ts**

Create `packages/nestjs-slonik/src/slonik.constants.ts`:

```typescript
export const SLONIK_POOL = Symbol('SLONIK_POOL');
```

**Step 5: Create slonik.interfaces.ts**

Create `packages/nestjs-slonik/src/slonik.interfaces.ts`:

```typescript
import type { ClientConfiguration } from 'slonik';

export interface SlonikModuleOptions {
  connectionUri: string;
  clientConfiguration?: ClientConfiguration;
}

export interface SlonikModuleAsyncOptions {
  imports?: any[];
  useFactory: (...args: any[]) => Promise<SlonikModuleOptions> | SlonikModuleOptions;
  inject?: any[];
}
```

**Step 6: Create slonik.decorators.ts**

Create `packages/nestjs-slonik/src/slonik.decorators.ts`:

```typescript
import { Inject } from '@nestjs/common';
import { SLONIK_POOL } from './slonik.constants';

export const InjectPool = (): ParameterDecorator => Inject(SLONIK_POOL);
```

**Step 7: Create slonik.module.ts**

Create `packages/nestjs-slonik/src/slonik.module.ts`:

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
      global: true,
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
      global: true,
      imports: options.imports || [],
      providers: [
        {
          provide: SLONIK_POOL,
          useFactory: async (...args: any[]) => {
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

**Step 8: Create index.ts**

Create `packages/nestjs-slonik/src/index.ts`:

```typescript
export { SlonikModule } from './slonik.module';
export { InjectPool } from './slonik.decorators';
export { SLONIK_POOL } from './slonik.constants';
export type {
  SlonikModuleOptions,
  SlonikModuleAsyncOptions,
} from './slonik.interfaces';
```

**Step 9: Install dependencies and build**

Run:
```bash
pnpm install
pnpm --filter @danilomartinelli/nestjs-slonik build
```

Expected: Package builds successfully, `dist/` contains compiled JS and declaration files.

**Step 10: Commit**

```bash
git add packages/nestjs-slonik/
git commit -m "feat: create @danilomartinelli/nestjs-slonik package"
```

---

### Task 12: Upgrade slonik and switch to new nestjs-slonik package

**Files:**
- Modify: `packages/core/package.json` (slonik version, remove nestjs-slonik, add @danilomartinelli/nestjs-slonik)
- Modify: `apps/api/package.json` (slonik version, remove nestjs-slonik, @slonik/migrator, add @danilomartinelli/nestjs-slonik)
- Modify: `packages/core/src/db/sql-repository.base.ts` (update slonik imports if API changed)
- Modify: `apps/api/src/app.module.ts` (SlonikModule import from new package)
- Modify: `apps/api/src/modules/user/database/user.repository.ts` (InjectPool from new package)
- Modify: `apps/api/src/modules/wallet/database/wallet.repository.ts` (InjectPool from new package)
- Modify: `apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts` (InjectPool from new package)
- Modify: `apps/api/tests/setup/jestSetupAfterEnv.ts` (slonik createPool if API changed)

**Step 1: Update slonik and remove old packages**

Run:
```bash
pnpm --filter @repo/core remove nestjs-slonik
pnpm --filter @repo/core add slonik@^48 @danilomartinelli/nestjs-slonik@workspace:*

pnpm --filter @repo/api remove nestjs-slonik @slonik/migrator
pnpm --filter @repo/api add slonik@^48 @danilomartinelli/nestjs-slonik@workspace:*
```

**Step 2: Update SlonikModule import in app.module.ts**

In `apps/api/src/app.module.ts`, change:
```typescript
import { SlonikModule } from 'nestjs-slonik';
```
to:
```typescript
import { SlonikModule } from '@danilomartinelli/nestjs-slonik';
```

The `SlonikModule.forRoot({ connectionUri: postgresConnectionUri })` call stays the same.

**Step 3: Update InjectPool imports in repositories**

In `apps/api/src/modules/user/database/user.repository.ts`, change:
```typescript
import { InjectPool } from 'nestjs-slonik';
```
to:
```typescript
import { InjectPool } from '@danilomartinelli/nestjs-slonik';
```

In `apps/api/src/modules/wallet/database/wallet.repository.ts`, change:
```typescript
import { InjectPool } from 'nestjs-slonik';
```
to:
```typescript
import { InjectPool } from '@danilomartinelli/nestjs-slonik';
```

In `apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts`, change:
```typescript
import { InjectPool } from 'nestjs-slonik';
```
to:
```typescript
import { InjectPool } from '@danilomartinelli/nestjs-slonik';
```

**Step 4: Handle slonik v48 API changes**

Slonik v48 has significant API changes from v31. Key changes to check and fix:

1. `createPool` is now async (returns `Promise<DatabasePool>`) — already used as async in our `SlonikModule.forRoot` factory
2. `sql.type(zodSchema)` — verify this still works in v48. If the API changed, update `sql-repository.base.ts` and all query handlers
3. `sql.identifier`, `sql.join`, `sql.timestamp` — verify these still exist in v48
4. `UniqueIntegrityConstraintViolationError` — verify import path
5. `DatabasePool`, `DatabaseTransactionConnection` types — verify import path

Run: `pnpm turbo build` and fix any slonik v48 compilation errors.

The most likely changes are:
- Import paths may have changed
- `sql.type()` may have a different API
- Pool configuration types may have changed

Fix each compilation error as it appears. The core files to update are:
- `packages/core/src/db/sql-repository.base.ts`
- `apps/api/src/modules/user/database/user.repository.ts`
- `apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts`
- `apps/api/tests/setup/jestSetupAfterEnv.ts`

**Step 5: Verify build**

Run: `pnpm turbo build`
Expected: All packages build successfully.

**Step 6: Commit**

```bash
git add packages/core/package.json apps/api/package.json pnpm-lock.yaml
git add packages/core/src/db/sql-repository.base.ts
git add apps/api/src/app.module.ts
git add apps/api/src/modules/user/database/user.repository.ts
git add apps/api/src/modules/wallet/database/wallet.repository.ts
git add apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts
git add apps/api/tests/setup/jestSetupAfterEnv.ts
git commit -m "feat: upgrade slonik to v48, switch to @danilomartinelli/nestjs-slonik"
```

---

### Task 13: Replace slonik-migrator with Flyway

**Files:**
- Modify: `apps/api/docker/docker-compose.yml` (add Flyway service)
- Rename: `apps/api/database/migrations/2022.10.07T13.49.19.users.sql` → `apps/api/database/migrations/V1__users.sql`
- Rename: `apps/api/database/migrations/2022.10.07T13.49.54.wallets.sql` → `apps/api/database/migrations/V2__wallets.sql`
- Delete: `apps/api/database/migrations/down/` (Flyway doesn't use separate down files by default)
- Delete: `apps/api/database/getMigrator.ts`
- Delete: `apps/api/database/migrate.ts`
- Modify: `apps/api/package.json` (remove migration scripts)

**Step 1: Add Flyway to docker-compose.yml**

In `apps/api/docker/docker-compose.yml`, add the Flyway service and a healthcheck to postgres:

```yaml
services:
  postgres:
    container_name: postgres-container
    image: postgres:alpine
    ports:
      - 5432:5432
    environment:
      POSTGRES_USER: 'user'
      POSTGRES_PASSWORD: 'password'
      POSTGRES_DB: 'ddh'
    volumes:
      - ddh-postgres:/var/lib/postgresql/data
    networks:
      - postgres
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d ddh"]
      interval: 5s
      timeout: 5s
      retries: 5

  flyway:
    container_name: flyway-container
    image: redgate/flyway
    command: -url=jdbc:postgresql://postgres:5432/ddh -user=user -password=password migrate
    volumes:
      - ../database/migrations:/flyway/sql
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - postgres

  pgadmin:
    container_name: pgadmin_container
    image: dpage/pgadmin4
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@email.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - 5050:80
    networks:
      - postgres
```

Remove `version: '3.9'` (deprecated in modern Docker Compose).

**Step 2: Rename migration files to Flyway convention**

```bash
cd apps/api/database/migrations
mv "2022.10.07T13.49.19.users.sql" "V1__users.sql"
mv "2022.10.07T13.49.54.wallets.sql" "V2__wallets.sql"
```

**Step 3: Delete down migrations and slonik migration files**

```bash
rm -rf apps/api/database/migrations/down/
rm apps/api/database/getMigrator.ts
rm apps/api/database/migrate.ts
```

**Step 4: Update seed.ts to not depend on getMigrator**

In `apps/api/database/seed.ts`, the file imports `getMigrator`. Since we're removing the migrator, simplify seed.ts to use slonik directly:

Replace `apps/api/database/seed.ts` with:

```typescript
import { createPool } from 'slonik';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const envPath = path.resolve(
  __dirname,
  process.env.NODE_ENV === 'test' ? '../.env.test' : '../.env',
);
dotenv.config({ path: envPath });

const connectionUri = `postgres://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}/${process.env.DB_NAME}`;

const directoryPath = path.join(__dirname, 'seeds');

async function runAll(): Promise<void> {
  const pool = await createPool(connectionUri);

  const files = fs.readdirSync(directoryPath);
  for (const file of files) {
    console.log(`executing seed: ${file} ...`);
    const data = fs.readFileSync(path.resolve(directoryPath, file), {
      encoding: 'utf8',
    });
    await pool.query({ sql: data, values: [], type: 'SLONIK_TOKEN_SQL' } as any);
    console.log(`${file} seed executed`);
  }

  await pool.end();
  console.log('done');
  process.exit(0);
}

runAll();
```

**Step 5: Remove migration scripts from package.json**

In `apps/api/package.json`, remove these scripts:
- `"migration:create"`
- `"migration:up"`
- `"migration:up:tests"`
- `"migration:down"`
- `"migration:down:tests"`
- `"migration:executed"`
- `"migration:executed:tests"`
- `"migration:pending"`
- `"migration:pending:tests"`

Keep `"seed:up"` but update it to: `"seed:up": "ts-node database/seed"`

**Step 6: Verify build**

Run: `pnpm turbo build`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git rm apps/api/database/getMigrator.ts apps/api/database/migrate.ts
git rm -r apps/api/database/migrations/down/
git add apps/api/database/migrations/V1__users.sql apps/api/database/migrations/V2__wallets.sql
git add apps/api/docker/docker-compose.yml apps/api/database/seed.ts apps/api/package.json
git commit -m "feat: replace slonik-migrator with Flyway, update docker-compose"
```

---

## Layer 5: Libraries

### Task 14: Replace oxide.ts with neverthrow

**Files:**
- Modify: `packages/core/package.json` (remove oxide.ts, add neverthrow)
- Modify: `apps/api/package.json` (remove oxide.ts, add neverthrow)
- Modify: `packages/core/src/ddd/repository.port.ts`
- Modify: `packages/core/src/db/sql-repository.base.ts`
- Modify: `apps/api/src/modules/user/commands/create-user/create-user.service.ts`
- Modify: `apps/api/src/modules/user/commands/create-user/create-user.http.controller.ts`
- Modify: `apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts`
- Modify: `apps/api/src/modules/user/commands/delete-user/delete-user.service.ts`
- Modify: `apps/api/src/modules/user/commands/delete-user/delete-user.http-controller.ts`
- Modify: `apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts`
- Modify: `apps/api/src/modules/user/queries/find-users/find-users.http.controller.ts`
- Modify: `apps/api/src/modules/user/queries/find-users/find-users.graphql-resolver.ts`
- Modify: `apps/api/src/modules/wallet/domain/wallet.entity.ts`

**Step 1: Install neverthrow, remove oxide.ts**

Run:
```bash
pnpm --filter @repo/core remove oxide.ts
pnpm --filter @repo/core add neverthrow

pnpm --filter @repo/api remove oxide.ts
pnpm --filter @repo/api add neverthrow
```

**Step 2: Update repository.port.ts**

In `packages/core/src/ddd/repository.port.ts`, change:
```typescript
import { Option } from 'oxide.ts';
```
to remove that import entirely.

Change the `findOneById` return type from `Promise<Option<Entity>>` to `Promise<Entity | undefined>`:

```typescript
export interface RepositoryPort<Entity> {
  insert(entity: Entity | Entity[]): Promise<void>;
  findOneById(id: string): Promise<Entity | undefined>;
  findAll(): Promise<Entity[]>;
  findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<Entity>>;
  delete(entity: Entity): Promise<boolean>;
  transaction<T>(handler: () => Promise<T>): Promise<T>;
}
```

**Step 3: Update sql-repository.base.ts**

In `packages/core/src/db/sql-repository.base.ts`, change:
```typescript
import { None, Option, Some } from 'oxide.ts';
```
to remove that import entirely.

Update `findOneById`:
```typescript
async findOneById(id: string): Promise<Aggregate | undefined> {
  const query = sql.type(this.schema)`SELECT * FROM ${sql.identifier([
    this.tableName,
  ])} WHERE id = ${id}`;

  const result = await this.pool.query(query);
  return result.rows[0] ? this.mapper.toDomain(result.rows[0]) : undefined;
}
```

**Step 4: Update create-user.service.ts**

In `apps/api/src/modules/user/commands/create-user/create-user.service.ts`, change:
```typescript
import { Err, Ok, Result } from 'oxide.ts';
```
to:
```typescript
import { err, ok, Result } from 'neverthrow';
```

Change `return Ok(user.id);` to `return ok(user.id);`
Change `return Err(new UserAlreadyExistsError(error));` to `return err(new UserAlreadyExistsError(error));`

**Step 5: Update create-user.http.controller.ts**

In `apps/api/src/modules/user/commands/create-user/create-user.http.controller.ts`, change:
```typescript
import { match, Result } from 'oxide.ts';
```
to:
```typescript
import { Result } from 'neverthrow';
```

Replace the `match(result, { Ok: ..., Err: ... })` pattern with neverthrow's `.match()`:

```typescript
return result.match(
  (id: string) => new IdResponse(id),
  (error: Error) => {
    if (error instanceof UserAlreadyExistsError)
      throw new ConflictHttpException(error.message);
    throw error;
  },
);
```

**Step 6: Update create-user.graphql-resolver.ts**

In `apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts`, change:
```typescript
import { Result } from 'oxide.ts';
```
to:
```typescript
import { Result } from 'neverthrow';
```

Change `id.unwrap()` to `id._unsafeUnwrap()` (or use `.match()` for safer handling):
```typescript
const result: Result<AggregateID, UserAlreadyExistsError> =
  await this.commandBus.execute(command);

return result.match(
  (id) => new IdGqlResponse(id),
  (error) => { throw error; },
);
```

**Step 7: Update delete-user.service.ts**

In `apps/api/src/modules/user/commands/delete-user/delete-user.service.ts`, change:
```typescript
import { Err, Ok, Result } from 'oxide.ts';
```
to:
```typescript
import { err, ok, Result } from 'neverthrow';
```

Replace `.isNone()` / `.unwrap()` (oxide.ts Option) with undefined checks:
```typescript
async execute(
  command: DeleteUserCommand,
): Promise<Result<boolean, NotFoundException>> {
  const found = await this.userRepo.findOneById(command.userId);
  if (!found) return err(new NotFoundException());
  found.delete();
  const result = await this.userRepo.delete(found);
  return ok(result);
}
```

**Step 8: Update delete-user.http-controller.ts**

In `apps/api/src/modules/user/commands/delete-user/delete-user.http-controller.ts`, change:
```typescript
import { match, Result } from 'oxide.ts';
```
to:
```typescript
import { Result } from 'neverthrow';
```

Replace `match(result, { Ok: ..., Err: ... })`:
```typescript
result.match(
  (isOk: boolean) => isOk,
  (error: Error) => {
    if (error instanceof NotFoundException)
      throw new NotFoundHttpException(error.message);
    throw error;
  },
);
```

**Step 9: Update find-users.query-handler.ts**

In `apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts`, change:
```typescript
import { Ok, Result } from 'oxide.ts';
```
to:
```typescript
import { ok, Result } from 'neverthrow';
```

Change `return Ok(new Paginated(...))` to `return ok(new Paginated(...))`.

**Step 10: Update find-users.http.controller.ts**

In `apps/api/src/modules/user/queries/find-users/find-users.http.controller.ts`, change:
```typescript
import { Result } from 'oxide.ts';
```
to:
```typescript
import { Result } from 'neverthrow';
```

Change `result.unwrap()` to `result._unsafeUnwrap()` or use `.match()`:
```typescript
const paginated = result.match(
  (data) => data,
  (error) => { throw error; },
);
```

**Step 11: Update find-users.graphql-resolver.ts**

In `apps/api/src/modules/user/queries/find-users/find-users.graphql-resolver.ts`, change:
```typescript
import { Result } from 'oxide.ts';
```
to:
```typescript
import { Result } from 'neverthrow';
```

Change `result.unwrap()` to:
```typescript
const paginated = result.match(
  (data) => data,
  (error) => { throw error; },
);
```

**Step 12: Update wallet.entity.ts**

In `apps/api/src/modules/wallet/domain/wallet.entity.ts`, change:
```typescript
import { Err, Ok, Result } from 'oxide.ts';
```
to:
```typescript
import { err, ok, Result } from 'neverthrow';
```

Change `return Err(...)` to `return err(...)` and `return Ok(null)` to `return ok(null)`.

**Step 13: Verify build**

Run: `pnpm turbo build`
Expected: All packages build successfully with no oxide.ts references remaining.

Verify no remaining references:
```bash
grep -r "oxide.ts" packages/ apps/ --include="*.ts"
```
Expected: No matches.

**Step 14: Commit**

```bash
git add packages/core/ apps/api/ pnpm-lock.yaml
git commit -m "feat: replace oxide.ts with neverthrow"
```

---

### Task 15: Replace nanoid with uuid

**Files:**
- Modify: `packages/core/package.json` (remove nanoid)
- Modify: `apps/api/package.json` (remove nanoid)
- Modify: `packages/core/src/application/context/ContextInterceptor.ts`

**Step 1: Remove nanoid**

Run:
```bash
pnpm --filter @repo/core remove nanoid
pnpm --filter @repo/api remove nanoid
```

**Step 2: Update ContextInterceptor.ts**

In `packages/core/src/application/context/ContextInterceptor.ts`, change:
```typescript
import { nanoid } from 'nanoid';
```
to:
```typescript
import { randomUUID } from 'crypto';
```

Change:
```typescript
const requestId = request?.body?.requestId ?? nanoid(6);
```
to:
```typescript
const requestId = request?.body?.requestId ?? randomUUID().slice(0, 6);
```

Note: Using `crypto.randomUUID()` (built-in Node.js) instead of adding uuid as a dep to core. The 6-char slice maintains the same short ID behavior.

**Step 3: Verify build**

Run: `pnpm turbo build`

**Step 4: Commit**

```bash
git add packages/core/package.json packages/core/src/application/context/ContextInterceptor.ts apps/api/package.json pnpm-lock.yaml
git commit -m "chore: replace nanoid with crypto.randomUUID"
```

---

### Task 16: Upgrade Zod to v4

**Files:**
- Modify: `packages/core/package.json` (zod version)
- Modify: `apps/api/package.json` (zod version)
- Modify: `apps/api/src/modules/user/database/user.repository.ts` (zod schema if needed)
- Modify: `apps/api/src/modules/wallet/database/wallet.repository.ts` (zod schema if needed)

**Step 1: Install Zod v4**

Run:
```bash
pnpm --filter @repo/core add zod@^4
pnpm --filter @repo/api add zod@^4
```

**Step 2: Review and update Zod schemas**

Check `apps/api/src/modules/user/database/user.repository.ts`:

```typescript
export const userSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.preprocess((val: any) => new Date(val), z.date()),
  updatedAt: z.preprocess((val: any) => new Date(val), z.date()),
  email: z.string().email(),
  country: z.string().min(1).max(255),
  postalCode: z.string().min(1).max(20),
  street: z.string().min(1).max(255),
  role: z.nativeEnum(UserRoles),
});
```

Zod v4 changes:
- `z.string().uuid()` still works (the `z.uuid()` shorthand is optional)
- `z.string().email()` still works (the `z.email()` shorthand is optional)
- `z.preprocess` still works in v4
- `z.nativeEnum` still works in v4
- `z.object` still works in v4

The existing schemas should be compatible with Zod v4 without changes. If compilation errors appear, the most likely fix is:
- `z.TypeOf` → `z.infer` (if `TypeOf` was removed)

**Step 3: Verify build**

Run: `pnpm turbo build`

**Step 4: Commit**

```bash
git add packages/core/package.json apps/api/package.json pnpm-lock.yaml
git commit -m "chore: upgrade Zod to v4"
```

---

### Task 17: Upgrade remaining libraries

**Files:**
- Modify: `packages/core/package.json`
- Modify: `apps/api/package.json`

**Step 1: Upgrade class-validator**

Run:
```bash
pnpm --filter @repo/core add class-validator@^0.15
pnpm --filter @repo/api add class-validator@^0.15
```

Note: `forbidUnknownValues` now defaults to `true`. Check `ValidationPipe` usage in:
- `apps/api/src/main.ts`: `new ValidationPipe({ transform: true, whitelist: true })`
- `apps/api/tests/setup/jestSetupAfterEnv.ts`: same

The `whitelist: true` option already strips unknown properties, so `forbidUnknownValues: true` is compatible. No changes needed.

**Step 2: Upgrade uuid**

Run:
```bash
pnpm --filter @repo/api add uuid@^11
```

**Step 3: Upgrade dotenv**

Run:
```bash
pnpm --filter @repo/core add dotenv@^17
pnpm --filter @repo/api add dotenv@^17
```

**Step 4: Upgrade rxjs**

Run:
```bash
pnpm --filter @repo/core add rxjs@^7.8
pnpm --filter @repo/api add rxjs@^7.8
```

**Step 5: Upgrade env-var**

Run:
```bash
pnpm --filter @repo/api add env-var@^7.5
```

**Step 6: Upgrade jest-cucumber**

Run:
```bash
pnpm --filter @repo/api add jest-cucumber@^3
```

**Step 7: Verify build**

Run: `pnpm turbo build`
Expected: All packages build successfully.

**Step 8: Commit**

```bash
git add packages/core/package.json apps/api/package.json pnpm-lock.yaml
git commit -m "chore: upgrade remaining libraries (class-validator, uuid, dotenv, rxjs)"
```

---

## Final Verification

### Task 18: Full build and lint verification

**Step 1: Clean and rebuild everything**

Run:
```bash
pnpm turbo build --force
```
Expected: All packages build successfully.

**Step 2: Run lint**

Run:
```bash
pnpm turbo lint
```
Expected: No errors (warnings are OK).

**Step 3: Run format**

Run:
```bash
pnpm turbo format
```

**Step 4: Verify no remaining references to removed packages**

Run:
```bash
grep -r "oxide.ts\|nestjs-slonik\|nanoid\|apollo-server-express\|apollo-server-core\|@slonik/migrator\|nestjs-console\|source-map-support" packages/ apps/ --include="*.ts" --include="*.json" -l
```
Expected: Only `pnpm-lock.yaml` and `packages/nestjs-slonik/` files (the new package).

**Step 5: Commit any formatting changes**

```bash
git add -A
git commit -m "chore: final formatting after dependency upgrades"
```

---

### Task 19: Run tests (requires database)

**Step 1: Start Docker environment**

Run:
```bash
cd apps/api && docker compose --file docker/docker-compose.yml up -d
```

Wait for Flyway to run migrations (check logs):
```bash
docker logs flyway-container
```
Expected: `Successfully applied 2 migrations`

**Step 2: Run unit tests**

Run:
```bash
pnpm turbo test
```

**Step 3: Run E2E tests**

Ensure test database exists and has migrations applied. You may need to create the test database manually and run Flyway against it:
```bash
docker exec postgres-container psql -U user -c "CREATE DATABASE ddh_tests;"
docker run --rm --network api_postgres -v $(pwd)/apps/api/database/migrations:/flyway/sql redgate/flyway -url=jdbc:postgresql://postgres:5432/ddh_tests -user=user -password=password migrate
```

Then run:
```bash
pnpm turbo test:e2e
```

**Step 4: Fix any test failures**

Common issues:
- slonik v48 query API changes in test setup
- class-validator v0.15 `forbidUnknownValues` rejecting previously valid requests
- neverthrow API differences in assertions

**Step 5: Commit test fixes**

```bash
git add -A
git commit -m "fix: resolve test failures after dependency upgrades"
```
