# Phase 3 Gaps — Input Sanitization & Health Check

**Date:** 2026-03-07
**Status:** Approved

---

## 1. Input Sanitization (XSS — decorator-based)

### Approach

Custom decorators using `@Transform` from `class-transformer` + `sanitize-html` library. Applied per-field on DTOs.

### New Files

- `packages/infra/src/security/decorators/sanitize.decorators.ts` — exports `@SanitizeHtml()` and `@Trim()`
- `packages/infra/src/security/decorators/sanitize.decorators.spec.ts` — unit tests

### Dependencies

- `sanitize-html` (runtime) in `packages/infra`
- `@types/sanitize-html` (dev) in `packages/infra`

### Decorator Behavior

- `@SanitizeHtml()`: wraps `@Transform` to call `sanitize-html` with `{ allowedTags: [], allowedAttributes: {} }` — strips all HTML.
- `@Trim()`: wraps `@Transform` to call `.trim()` on string values.
- Both are no-ops for non-string values.

### DTO Changes

Apply `@SanitizeHtml()` to all user-facing string fields in existing DTOs:

- `create-user.request.dto.ts` (email, country, postalCode, street)
- `find-users.request.dto.ts` (country, postalCode, street)

### Integration

Works automatically via `ValidationPipe({ transform: true })` already configured in `main.ts`.

### Re-export

Export decorators from `packages/infra/src/security/index.ts` → `packages/infra/src/index.ts`.

---

## 2. Health Check — Uptime, Version, Environment

### Approach

New `AppHealthIndicator` extending `@nestjs/terminus` `HealthIndicator`, registered alongside existing `SlonikHealthIndicator`.

### New Files

- `packages/infra/src/health/app-health.indicator.ts`
- `packages/infra/src/health/__tests__/app-health.indicator.spec.ts`

### Changes to Existing Files

- `packages/infra/src/health/health.module.ts` — `forRoot()` accepts `{ version: string }` in addition to pool token.
- `packages/infra/src/health/health.controller.ts` — adds `AppHealthIndicator` check.
- `apps/api/src/app.module.ts` — passes version to `HealthModule.forRoot()`.

### Response Shape

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "app": {
      "status": "up",
      "uptime": 12345.67,
      "version": "0.1.0",
      "environment": "production"
    }
  }
}
```

### `AppHealthIndicator` Details

- `uptime`: `process.uptime()` in seconds
- `version`: passed via module config (from `package.json` or hardcoded)
- `environment`: `process.env.NODE_ENV ?? 'development'`
