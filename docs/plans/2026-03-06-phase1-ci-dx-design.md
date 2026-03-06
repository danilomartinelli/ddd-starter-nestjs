# Phase 1: CI/CD & Developer Experience — Design

## Overview

Add automated quality guardrails to the project: a GitHub Actions CI pipeline with parallel jobs, pre-commit hooks via husky + lint-staged, Codecov integration, and a restructured README with status badges.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| CI structure | Parallel jobs in single workflow | Faster feedback, granular status checks, leverages Turbo cache |
| Remote cache | Self-hosted (ducktors/turborepo-remote-cache) | Avoids vendor lock-in, free |
| Coverage | Codecov integration | Badge support, PR annotations, threshold enforcement |
| Type-check hook | Pre-commit (tsc --noEmit) | Catches type errors before they reach CI |
| Hook tooling | husky v9 + lint-staged v15 | Industry standard, auto-installs via `prepare` script |

## 1. CI Pipeline — `.github/workflows/ci.yml`

**Triggers:** `push` to `main`, `pull_request` to `main`.

**Jobs (parallel):**

| Job | Steps | Service containers |
|-----|-------|--------------------|
| `lint` | `pnpm lint`, `pnpm format --check` | — |
| `build` | `pnpm build` (includes tsc via Turbo) | — |
| `test-unit` | `pnpm test -- --coverage`, upload to Codecov | — |
| `test-e2e` | `pnpm -F @repo/api test:e2e` | PostgreSQL 17 |
| `deps-validate` | `pnpm -F @repo/api deps:validate` | — |

**Shared setup (all jobs):**
- `actions/checkout@v4`
- `pnpm/action-setup@v4` (pnpm 9.15.4)
- `actions/setup-node@v4` (Node 22.x, pnpm cache)
- `pnpm install --frozen-lockfile`
- Turbo remote cache env vars: `TURBO_TOKEN`, `TURBO_TEAM`, `TURBO_API`

**Codecov:** `codecov/codecov-action@v5` after unit tests. Requires `CODECOV_TOKEN` GitHub secret.

**Matrix:** Node 22.x, ubuntu-latest (single target — reference project, not a library).

## 2. Pre-commit Hooks

**Installation:**
- `husky` and `lint-staged` as root devDependencies
- `"prepare": "husky"` in root package.json — auto-installs hooks after `pnpm install`

**`.husky/pre-commit`:**
1. `npx lint-staged` — runs on staged files only
2. `pnpm -r exec tsc --noEmit` — full type-check across all workspaces

**lint-staged config (root package.json):**
```json
{
  "lint-staged": {
    "*.{ts,tsx,js,mjs}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

## 3. README Restructuring

**Move current README to `docs/ARCHITECTURE.md`:**
- Only the architecture guide content (from `# Architecture` section onwards)
- Strips the fork disclaimer and project intro (those stay in root README)

**New `README.md`:**
- Fork disclaimer/credit (first section from current README, lines 1-17)
- Badge row: CI status, Codecov coverage, Node.js version, License
- One-paragraph project description
- Quick start section (prerequisites, install, dev, test)
- Links to: `docs/ARCHITECTURE.md`, `CLAUDE.md`, `NEXT_STEPS.md`
- License section

## Dependencies to Add

```
devDependencies (root):
- husky@^9
- lint-staged@^15
```

## GitHub Secrets Required

| Secret | Purpose |
|--------|---------|
| `TURBO_TOKEN` | Self-hosted remote cache auth |
| `TURBO_TEAM` | Turbo team identifier |
| `TURBO_API` | URL of ducktors/turborepo-remote-cache instance |
| `CODECOV_TOKEN` | Codecov upload token |

## Files Created/Modified

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Create |
| `.husky/pre-commit` | Create |
| `package.json` (root) | Add `prepare`, `lint-staged`, devDependencies |
| `README.md` | Replace (new concise README) |
| `docs/ARCHITECTURE.md` | Create (moved architecture content) |
