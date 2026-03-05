# Turborepo Monorepo Setup Design

## Context

Single-package NestJS application using DDD/hexagonal architecture. Goal: convert to a pnpm monorepo with Turborepo for task orchestration and caching, preparing for future domain-based package splitting.

## Decisions

- **Package manager**: pnpm (with `pnpm-workspace.yaml`)
- **Package scope**: `@repo/...` for internal workspace packages
- **Approach**: Foundation + Initial Split (move app to `apps/api/`, extract `src/libs/` to `packages/core/`)

## Directory Structure

```
domain-driven-hexagon-v2/
├── apps/
│   └── api/                    # Current NestJS app
│       ├── src/
│       │   ├── modules/        # user/, wallet/ etc.
│       │   ├── configs/
│       │   ├── main.ts
│       │   └── app.module.ts
│       ├── database/           # migrations, seeds
│       ├── docker/
│       ├── nest-cli.json
│       ├── .jestrc.json
│       ├── jest-e2e.json
│       ├── tsconfig.json
│       └── package.json        # @repo/api
│
├── packages/
│   └── core/                   # Extracted from src/libs/
│       ├── src/
│       │   ├── ddd/
│       │   ├── api/
│       │   ├── application/
│       │   ├── db/
│       │   ├── exceptions/
│       │   ├── decorators/
│       │   ├── types/
│       │   ├── utils/
│       │   └── index.ts        # barrel export
│       ├── tsconfig.json
│       └── package.json        # @repo/core
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json                # Workspace root
├── tsconfig.base.json          # Shared TS config
└── .gitignore
```

## Turborepo Configuration

```jsonc
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
    "deps:validate": {}
  }
}
```

- `build` uses topological dependency (`^build`) so `packages/core` builds first
- `lint` and `test` depend on `^build` to ensure core is built before consuming packages run
- `test:e2e` depends on same-package `build`
- Migration/docker/seed scripts excluded from turbo (side effects, not cacheable)

## pnpm Workspace

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## Root package.json

Minimal workspace root with turbo scripts that delegate to workspaces:

- `build`, `lint`, `test`, `test:e2e`, `format` -> `turbo run <task>`
- `dev` -> `turbo run start:dev`
- App-specific scripts (migrations, docker, seed) run via `pnpm --filter api <script>`
- `packageManager: "pnpm@9.15.4"`

## Import Migration

Relative imports from `src/libs/...`:
```ts
import { Entity } from '../../libs/ddd/entity.base';
```

Become workspace package imports:
```ts
import { Entity } from '@repo/core';
```

`@repo/core` provides a barrel `src/index.ts` re-exporting all public APIs.

## .gitignore Updates

Add:
```
.turbo/
```

Remove `/package-lock.json` (switching to pnpm which uses `pnpm-lock.yaml`).
