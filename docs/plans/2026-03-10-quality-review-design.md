# Quality Review & Refactoring Design

**Goal:** Fix all 21 issues found in the post-implementation audit of Phases 5-10.

**Approach:** Fix by severity (P0 first, then P1, then P2), grouped by area to minimize context switching.

## P0 — Critical (4 issues)

1. Remove JWT secret fallback, inject via validated config
2. Wrap refresh token rotation in DB transaction
3. Make GqlAuthGuard/RolesGuard detect REST vs GraphQL context
4. Auth cross-module imports — accepted deviation, document exemption properly

## P1 — Important (10 issues)

5. Extract shared `TokenService` for `generateTokens`
6. Move `AuthTokens` interface to `auth.types.ts`
7. Standardize all DI tokens to `Symbol()` pattern
8. Replace `sql.unsafe` with typed alternatives in infra repos
9. Use `z.uuid()` for all ID fields in Zod schemas
10. Complete `env.schema.ts` with all missing vars
11. Replace direct `process.env` reads with `get()` from env-var
12. Remove dead code (unused events, errors)
13. Add Zod validation to RefreshTokenRepository writes
14. Add missing tests (logout, scheduler, guards)

## P2 — Cosmetic (7 issues)

15. Standardize barrel export styles
16. Document `global: true` convention
17. Rename plural directories to singular
18. Move all options tokens to `.types.ts` files
19. Add JSDoc to options interfaces
20. Configure ESLint for infra package
21. Remove TODO comment
