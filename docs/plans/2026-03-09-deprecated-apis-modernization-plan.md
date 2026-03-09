# Deprecated APIs Modernization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace all deprecated Zod 4 APIs and legacy Node.js `'crypto'` imports with their modern equivalents.

**Architecture:** Pure refactor — no behavior changes. Zod schemas swap deprecated method-form APIs (`z.string().email()`, `z.nativeEnum()`, `z.preprocess()`) for top-level equivalents (`z.email()`, `z.enum()`, `z.coerce.date()`). Node.js imports add `node:` prefix. Documentation rules are updated to match.

**Tech Stack:** Zod 4.3.6, Node.js 22, TypeScript 5.9, Slonik 48

---

### Task 1: Modernize Zod schema in user.repository.ts

**Files:**

- Modify: `apps/api/src/modules/user/database/user.repository.ts:17-28`

**Step 1: Update the Zod schema and type alias**

Replace the schema block (lines 17-28) with:

```typescript
export const userSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  email: z.email(),
  country: z.string().min(1).max(255),
  postalCode: z.string().min(1).max(20),
  street: z.string().min(1).max(255),
  role: z.enum(UserRoles),
});

export type UserModel = z.infer<typeof userSchema>;
```

Changes:

- `z.string().uuid()` -> `z.uuid()`
- `z.preprocess((val: any) => new Date(val), z.date())` -> `z.coerce.date()` (x2)
- `z.string().email()` -> `z.email()`
- `z.nativeEnum(UserRoles)` -> `z.enum(UserRoles)`
- `z.TypeOf<typeof userSchema>` -> `z.infer<typeof userSchema>`

**Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

**Step 3: Run user-related tests**

Run: `cd apps/api && npx jest --config .jestrc.json --testPathPattern user`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/database/user.repository.ts
git commit -m "refactor(user): modernize Zod schema to use Zod 4 top-level APIs"
```

---

### Task 2: Modernize Zod schema in wallet.repository.ts

**Files:**

- Modify: `apps/api/src/modules/wallet/database/wallet.repository.ts:11-19`

**Step 1: Update the Zod schema and type alias**

Replace the schema block (lines 11-19) with:

```typescript
export const walletSchema = z.object({
  id: z.string().min(1).max(255),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  balance: z.number().min(0).max(9999999),
  userId: z.string().min(1).max(255),
});

export type WalletModel = z.infer<typeof walletSchema>;
```

Changes:

- `z.preprocess((val: any) => new Date(val), z.date())` -> `z.coerce.date()` (x2)
- `z.TypeOf<typeof walletSchema>` -> `z.infer<typeof walletSchema>`

Note: `z.string().min(1).max(255)` is NOT deprecated — keep as-is for id and userId.

**Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

**Step 3: Run wallet-related tests**

Run: `cd apps/api && npx jest --config .jestrc.json --testPathPattern wallet`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/api/src/modules/wallet/database/wallet.repository.ts
git commit -m "refactor(wallet): modernize Zod schema to use Zod 4 top-level APIs"
```

---

### Task 3: Modernize Node.js crypto imports in apps/api

**Files:**

- Modify: `apps/api/src/modules/user/domain/user.entity.ts:13`
- Modify: `apps/api/src/modules/wallet/domain/wallet.entity.ts:9`
- Modify: `apps/api/tests/factories/wallet.factory.ts:2`

**Step 1: Update imports in all three files**

In each file, change:

```typescript
import { randomUUID } from "crypto";
```

To:

```typescript
import { randomUUID } from "node:crypto";
```

Exact locations:

- `user.entity.ts` line 13: `import { randomUUID } from 'crypto';`
- `wallet.entity.ts` line 9: `import { randomUUID } from 'crypto';`
- `wallet.factory.ts` line 2: `import { randomUUID } from 'crypto';`

**Step 2: Verify it compiles**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

**Step 3: Run all tests to verify nothing broke**

Run: `cd apps/api && pnpm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/domain/user.entity.ts apps/api/src/modules/wallet/domain/wallet.entity.ts apps/api/tests/factories/wallet.factory.ts
git commit -m "refactor(api): use node: protocol for crypto imports"
```

---

### Task 4: Modernize Node.js crypto imports in packages/core

**Files:**

- Modify: `packages/core/src/ddd/command.base.ts:4`
- Modify: `packages/core/src/ddd/domain-event.base.ts:1`
- Modify: `packages/core/src/application/context/ContextInterceptor.ts:8`

**Step 1: Update imports in all three files**

In each file, change:

```typescript
import { randomUUID } from "crypto";
```

To:

```typescript
import { randomUUID } from "node:crypto";
```

Note: `ContextInterceptor.ts` uses double quotes — change to:

```typescript
import { randomUUID } from "node:crypto";
```

Exact locations:

- `command.base.ts` line 4: `import { randomUUID } from 'crypto';`
- `domain-event.base.ts` line 1: `import { randomUUID } from 'crypto';`
- `ContextInterceptor.ts` line 8: `import { randomUUID } from "crypto";`

**Step 2: Build the core package**

Run: `cd packages/core && pnpm build`
Expected: Build succeeds

**Step 3: Run downstream compilation check**

Run: `pnpm build`
Expected: All packages build successfully (core is a dependency of api)

**Step 4: Commit**

```bash
git add packages/core/src/ddd/command.base.ts packages/core/src/ddd/domain-event.base.ts packages/core/src/application/context/ContextInterceptor.ts
git commit -m "refactor(core): use node: protocol for crypto imports"
```

---

### Task 5: Modernize Node.js crypto imports in packages/infra and packages/testing

**Files:**

- Modify: `packages/infra/src/logging/logging.module.ts:3`
- Modify: `packages/testing/src/factories/index.ts:1`

**Step 1: Update imports in both files**

`logging.module.ts` line 3 (uses double quotes):

```typescript
// Before
import { randomUUID } from "crypto";
// After
import { randomUUID } from "node:crypto";
```

`packages/testing/src/factories/index.ts` line 1 (uses double quotes):

```typescript
// Before
import { randomUUID } from "crypto";
// After
import { randomUUID } from "node:crypto";
```

**Step 2: Build both packages**

Run: `pnpm build`
Expected: All packages build successfully

**Step 3: Run all tests across monorepo**

Run: `pnpm test`
Expected: All tests pass

**Step 4: Commit**

```bash
git add packages/infra/src/logging/logging.module.ts packages/testing/src/factories/index.ts
git commit -m "refactor(infra,testing): use node: protocol for crypto imports"
```

---

### Task 6: Update documentation rules

**Files:**

- Modify: `.claude/rules/infrastructure-layer.md:44-55,98`

**Step 1: Update the Zod schema example in the Repository Implementation section**

Replace the schema example block (lines 44-55) with:

```typescript
// 1. Zod schema for runtime validation
export const userSchema = z.object({
  id: z.uuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  email: z.email(),
  country: z.string().min(1).max(255),
  postalCode: z.string().min(1).max(20),
  street: z.string().min(1).max(255),
  role: z.enum(UserRoles),
});

export type UserModel = z.infer<typeof userSchema>;
```

**Step 2: Update the "Key rules" bullet about date fields (line 98)**

Change:

```
- Always use `z.preprocess((val: any) => new Date(val), z.date())` for date fields
```

To:

```
- Always use `z.coerce.date()` for date fields
```

**Step 3: Commit**

```bash
git add .claude/rules/infrastructure-layer.md
git commit -m "docs: update infrastructure-layer rules for Zod 4 modern APIs"
```

---

### Task 7: Final validation

**Step 1: Run full build**

Run: `pnpm build`
Expected: All packages build successfully

**Step 2: Run full test suite**

Run: `pnpm test`
Expected: All tests pass

**Step 3: Run architecture validation**

Run: `cd apps/api && pnpm deps:validate`
Expected: No layer dependency violations

**Step 4: Run linter and formatter**

Run: `pnpm lint && pnpm format`
Expected: No errors, code is clean
