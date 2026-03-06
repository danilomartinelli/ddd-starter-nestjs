# README Update Design

## Context

After the dependency upgrade + Turborepo migration (starting from commit `59d98f5`), the README.md contains outdated references to file paths, libraries, and code snippets. This design documents what needs to be updated.

## Approach

**Surgical update** — find-and-replace only what changed. Preserve 100% of the README structure, conceptual text, and external links.

## Changes Required

### 1. File Path Updates

All `src/` references must be updated to reflect the monorepo structure:

| Old Path | New Path |
|---|---|
| `src/modules/` | `apps/api/src/modules/` |
| `src/libs/ddd/` | `packages/core/src/ddd/` |
| `src/libs/db/` | `packages/core/src/db/` |
| `src/libs/ports/` | `packages/core/src/ports/` |
| `src/libs/guard.ts` | `packages/core/src/guard.ts` |
| `src/libs/exceptions/` | `packages/core/src/exceptions/` |
| `src/libs/decorators/` | `packages/core/src/decorators/` |
| `tests/` | `apps/api/tests/` |
| `.dependency-cruiser.js` | `apps/api/.dependency-cruiser.js` |

### 2. Library Reference Updates

| Old | New | README Section |
|---|---|---|
| oxide.ts | neverthrow | Domain Errors |
| nestjs-console | nest-commander | Controllers |

### 3. Code Snippet Updates

- Result pattern snippets: update imports from oxide.ts to neverthrow API
- `match(result, ...)` pattern: update to neverthrow's `.match()` syntax
- Verify all other inline snippets against actual codebase

### 4. CLI Controller Implementation

- Install `nest-commander` in `apps/api`
- Create `create-user.cli.controller.ts` using nest-commander decorators
- Update README reference from nestjs-console to nest-commander

### 5. What Does NOT Change

- README structure (sections, order, TOC)
- Conceptual/explanatory text about DDD, Hexagonal Architecture, etc.
- External links to articles, books, videos
- No mention of Turborepo/monorepo in README (per decision)
- Technology names in intro (NestJS, TypeScript, NodeJS, Slonik) — only Slonik, no wrapper mention

## Decisions

- **Slonik reference**: Keep as "Slonik" without mentioning the custom wrapper
- **Monorepo/Turborepo**: Not mentioned in README — it's about DDD patterns, not repo infra
- **oxide.ts → neverthrow**: Update all references AND code snippets
- **CLI controller**: Implement with nest-commander, create the file, update README
- **Code snippets**: Verify ALL against current codebase
