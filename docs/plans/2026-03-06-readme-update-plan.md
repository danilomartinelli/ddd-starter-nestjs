# README Update Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update README.md to reflect the dependency upgrade and monorepo migration, install nest-commander and create CLI controller.

**Architecture:** Surgical find-and-replace on README.md — update file paths, library references, and inline code snippets without changing the document structure. Additionally, install nest-commander and create a CLI controller example file.

**Tech Stack:** nest-commander, neverthrow, NestJS 11, Slonik 48, TypeScript 5.9

---

### Task 1: Install nest-commander

**Files:**
- Modify: `apps/api/package.json`

**Step 1: Install nest-commander in apps/api**

Run:
```bash
cd /Users/danilomartinelli/Workspace/github.com/danilomartinelli/domain-driven-hexagon-v2 && pnpm add nest-commander --filter @repo/api
```

**Step 2: Verify installation**

Run:
```bash
cat apps/api/package.json | grep nest-commander
```
Expected: `"nest-commander": "^3.x.x"` in dependencies

**Step 3: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml
git commit -m "feat: add nest-commander dependency for CLI controllers"
```

---

### Task 2: Create CLI controller with nest-commander

**Files:**
- Create: `apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`
- Modify: `apps/api/src/modules/user/user.module.ts`

**Step 1: Create the CLI controller file**

Create `apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`:

```typescript
import { Command, CommandRunner, Option } from 'nest-commander';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';
import { CreateUserCommand } from './create-user.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { AggregateID } from '@repo/core';
import { Logger } from '@nestjs/common';

interface CreateUserCliOptions {
  email: string;
  country: string;
  postalCode: string;
  street: string;
}

@Command({
  name: 'create-user',
  description: 'Create a new user',
})
export class CreateUserCliController extends CommandRunner {
  private readonly logger = new Logger(CreateUserCliController.name);

  constructor(private readonly commandBus: CommandBus) {
    super();
  }

  async run(_inputs: string[], options: CreateUserCliOptions): Promise<void> {
    const command = new CreateUserCommand(options);

    const result: Result<AggregateID, UserAlreadyExistsError> =
      await this.commandBus.execute(command);

    // In a CLI context we don't need to return HTTP status codes,
    // we just log the result or throw on error
    result.match(
      (id: string) => this.logger.log(`Successfully created user ${id}`),
      (error: Error) => {
        this.logger.error(error.message);
        process.exitCode = 1;
      },
    );
  }

  @Option({
    flags: '-e, --email <email>',
    description: 'User email address',
    required: true,
  })
  parseEmail(val: string): string {
    return val;
  }

  @Option({
    flags: '-c, --country <country>',
    description: 'Country of residence',
    required: true,
  })
  parseCountry(val: string): string {
    return val;
  }

  @Option({
    flags: '-p, --postal-code <postalCode>',
    description: 'Postal code',
    required: true,
  })
  parsePostalCode(val: string): string {
    return val;
  }

  @Option({
    flags: '-s, --street <street>',
    description: 'Street address',
    required: true,
  })
  parseStreet(val: string): string {
    return val;
  }
}
```

**Step 2: Register CLI controller in user module**

Modify `apps/api/src/modules/user/user.module.ts`:

Add import:
```typescript
import { CreateUserCliController } from './commands/create-user/create-user.cli.controller';
```

Add after `const messageControllers`:
```typescript
const cliControllers: Provider[] = [CreateUserCliController];
```

Update providers array to include `...cliControllers`:
```typescript
providers: [
    Logger,
    ...cliControllers,
    ...repositories,
    ...graphqlResolvers,
    ...commandHandlers,
    ...queryHandlers,
    ...mappers,
  ],
```

**Step 3: Verify build**

Run:
```bash
cd /Users/danilomartinelli/Workspace/github.com/danilomartinelli/domain-driven-hexagon-v2 && pnpm turbo build
```
Expected: Build succeeds

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts apps/api/src/modules/user/user.module.ts
git commit -m "feat: add create-user CLI controller using nest-commander"
```

---

### Task 3: Update all file paths in README

**Files:**
- Modify: `README.md`

Apply the following path replacements systematically. Each old path is a link target in markdown `[text](path)` format.

**Step 1: Update `src/modules/` paths to `apps/api/src/modules/`**

All occurrences (approximately 20+ instances):
- `src/modules/user/commands/create-user/create-user.service.ts` → `apps/api/src/modules/user/commands/create-user/create-user.service.ts`
- `src/modules/user/commands/create-user/create-user.command.ts` → `apps/api/src/modules/user/commands/create-user/create-user.command.ts`
- `src/modules/user/commands/create-user/create-user.message.controller.ts` → `apps/api/src/modules/user/commands/create-user/create-user.message.controller.ts`
- `src/modules/user/commands/create-user/create-user.http.controller.ts` → `apps/api/src/modules/user/commands/create-user/create-user.http.controller.ts`
- `src/modules/user/commands/create-user/create-user.cli.controller.ts` → `apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts`
- `src/modules/user/commands/create-user/create-user.request.dto.ts` → `apps/api/src/modules/user/commands/create-user/create-user.request.dto.ts`
- `src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts` → `apps/api/src/modules/user/commands/create-user/graphql-example/create-user.graphql-resolver.ts`
- `src/modules/user/domain/user.entity.ts` → `apps/api/src/modules/user/domain/user.entity.ts`
- `src/modules/user/domain/user.errors.ts` → `apps/api/src/modules/user/domain/user.errors.ts`
- `src/modules/user/domain/value-objects/address.value-object.ts` → `apps/api/src/modules/user/domain/value-objects/address.value-object.ts`
- `src/modules/user/domain/events/user-created.domain-event.ts` → `apps/api/src/modules/user/domain/events/user-created.domain-event.ts`
- `src/modules/user/database/user.repository.port.ts` → `apps/api/src/modules/user/database/user.repository.port.ts`
- `src/modules/user/user.mapper.ts` → `apps/api/src/modules/user/user.mapper.ts`
- `src/modules/user/dtos/user.response.dto.ts` → `apps/api/src/modules/user/dtos/user.response.dto.ts`
- `src/modules/user/queries/find-users/find-users.query-handler.ts` → `apps/api/src/modules/user/queries/find-users/find-users.query-handler.ts`
- `src/modules/user/commands` → `apps/api/src/modules/user/commands`
- `src/modules/wallet/domain/wallet.entity.ts` → `apps/api/src/modules/wallet/domain/wallet.entity.ts`
- `src/modules/wallet/application/event-handlers/create-wallet-when-user-is-created.domain-event-handler.ts` → `apps/api/src/modules/wallet/application/event-handlers/create-wallet-when-user-is-created.domain-event-handler.ts`
- `src/modules` (standalone directory reference) → `apps/api/src/modules`

**Step 2: Update `src/libs/` paths to `packages/core/src/`**

- `src/libs/ddd/aggregate-root.base.ts` → `packages/core/src/ddd/aggregate-root.base.ts`
- `src/libs/ddd/repository.port.ts` → `packages/core/src/ddd/repository.port.ts`
- `src/libs/db/sql-repository.base.ts` → `packages/core/src/db/sql-repository.base.ts`
- `src/libs/ports/logger.port.ts` → `packages/core/src/ports/logger.port.ts`
- `src/libs/guard.ts` → `packages/core/src/guard.ts`
- `src/libs/exceptions` → `packages/core/src/exceptions`
- `src/libs/decorators/final.decorator.ts` → `packages/core/src/decorators/final.decorator.ts`

**Step 3: Update `tests/` paths**

- `tests/user/create-user/create-user.feature` → `apps/api/tests/user/create-user/create-user.feature`
- `tests/user/create-user/create-user.e2e-spec.ts` → `apps/api/tests/user/create-user/create-user.e2e-spec.ts`

**Step 4: Update root config paths**

- `.dependency-cruiser.js` → `apps/api/.dependency-cruiser.js`

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update all file path references in README for monorepo structure"
```

---

### Task 4: Update library references in README

**Files:**
- Modify: `README.md`

**Step 1: Replace oxide.ts with neverthrow (line ~811)**

Change:
```markdown
- [oxide.ts](https://www.npmjs.com/package/oxide.ts) - this is a nice npm package if you want to use a Result object
```
To:
```markdown
- [neverthrow](https://www.npmjs.com/package/neverthrow) - this is a nice npm package if you want to use a Result object
```

**Step 2: Replace nestjs-console with nest-commander (line ~872)**

Change:
```markdown
- [create-user.cli.controller.ts](apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts) for command line interface access ([NestJS Console](https://www.npmjs.com/package/nestjs-console))
```
To:
```markdown
- [create-user.cli.controller.ts](apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts) for command line interface access ([nest-commander](https://www.npmjs.com/package/nest-commander))
```

**Step 3: Update Domain Errors example file descriptions (line ~817)**

Change:
```markdown
- [create-user.service.ts](apps/api/src/modules/user/commands/create-user/create-user.service.ts) - notice how `Err(new UserAlreadyExistsError())` is returned instead of throwing it.
```
To:
```markdown
- [create-user.service.ts](apps/api/src/modules/user/commands/create-user/create-user.service.ts) - notice how `err(new UserAlreadyExistsError())` is returned instead of throwing it.
```

**Step 4: Update CLI controller description (line ~819)**

Change the description about `.unwrap()` since neverthrow uses `.match()` instead:

Change:
```markdown
- [create-user.cli.controller.ts](apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts) - in a CLI controller we don't care about returning a correct status code so we just `.unwrap()` a result, which will just throw in case of an error.
```
To:
```markdown
- [create-user.cli.controller.ts](apps/api/src/modules/user/commands/create-user/create-user.cli.controller.ts) - in a CLI controller we don't need to return HTTP status codes, so we just log the result or exit with an error code.
```

**Step 5: Commit**

```bash
git add README.md
git commit -m "docs: update library references in README (oxide.ts -> neverthrow, nestjs-console -> nest-commander)"
```

---

### Task 5: Update inline code snippets in README

**Files:**
- Modify: `README.md`

**Step 1: Update Result pattern example (lines ~764-782)**

The current snippet uses oxide.ts API (`Err()`, `Ok()` with uppercase). Update to neverthrow API (`err()`, `ok()` with lowercase):

Change:
```typescript
function createUser(
  command: CreateUserCommand,
): Result<UserEntity, CreateUserError> {
  // ^ explicitly showing what function returns
  if (await userRepo.exists(command.email)) {
    return Err(new UserAlreadyExistsError()); // <- returning an Error
  }
  if (!validate(command.address)) {
    return Err(new IncorrectUserAddressError());
  }
  // else
  const user = UserEntity.create(command);
  await this.userRepo.save(user);
  return Ok(user);
}
```

To:
```typescript
function createUser(
  command: CreateUserCommand,
): Result<UserEntity, CreateUserError> {
  // ^ explicitly showing what function returns
  if (await userRepo.exists(command.email)) {
    return err(new UserAlreadyExistsError()); // <- returning an Error
  }
  if (!validate(command.address)) {
    return err(new IncorrectUserAddressError());
  }
  // else
  const user = UserEntity.create(command);
  await this.userRepo.save(user);
  return ok(user);
}
```

**Step 2: Update match pattern example (lines ~787-801)**

The current snippet uses oxide.ts `match(result, { Ok: ..., Err: ... })` pattern. Update to neverthrow's `result.match(okFn, errFn)`:

Change:
```typescript
/* in HTTP context we want to convert each error to an
error with a corresponding HTTP status code: 409, 400 or 500 */
const result = await this.commandBus.execute(command);
return match(result, {
  Ok: (id: string) => new IdResponse(id),
  Err: (error: Error) => {
    if (error instanceof UserAlreadyExistsError)
      throw new ConflictHttpException(error.message);
    if (error instanceof IncorrectUserAddressError)
      throw new BadRequestException(error.message);
    throw error;
  },
});
```

To:
```typescript
/* in HTTP context we want to convert each error to an
error with a corresponding HTTP status code: 409, 400 or 500 */
const result = await this.commandBus.execute(command);
return result.match(
  (id: string) => new IdResponse(id),
  (error: Error) => {
    if (error instanceof UserAlreadyExistsError)
      throw new ConflictHttpException(error.message);
    if (error instanceof IncorrectUserAddressError)
      throw new BadRequestException(error.message);
    throw error;
  },
);
```

**Step 3: Verify other inline snippets**

The following README inline snippets are **conceptual/illustrative** and remain correct as-is (verified against actual codebase patterns):
- Email Value Object example (lines ~544-558) — illustrative pattern, matches the concept in `address.value-object.ts`
- UserRoles enum example (lines ~619-626) — illustrative, actual enum is in `user.types.ts`
- ContactInfo type union example (lines ~631-643) — purely conceptual TypeScript example
- Error class hierarchy example (lines ~748-762) — conceptual, actual errors extend `ExceptionBase` from `@repo/core`
- Dependency cruiser config snippet (lines ~1213-1220) — configuration example, verify against actual file

**Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update inline code snippets to use neverthrow API"
```

---

### Task 6: Final verification

**Files:**
- Read: `README.md` (verify all changes)

**Step 1: Verify all linked paths exist**

Run the following to check every path referenced in README:
```bash
cd /Users/danilomartinelli/Workspace/github.com/danilomartinelli/domain-driven-hexagon-v2
grep -oP '\]\(([^)]+)\)' README.md | grep -v 'http' | sed 's/](//' | sed 's/)//' | while read path; do
  if [ ! -e "$path" ]; then
    echo "MISSING: $path"
  fi
done
```

Expected: No MISSING output (all paths exist)

**Step 2: Verify no oxide.ts references remain**

Run:
```bash
grep -n "oxide" README.md
```
Expected: No matches

**Step 3: Verify no nestjs-console references remain**

Run:
```bash
grep -n "nestjs-console" README.md
```
Expected: No matches

**Step 4: Verify no old `src/modules` or `src/libs` paths remain**

Run:
```bash
grep -n '(src/modules' README.md
grep -n '(src/libs' README.md
```
Expected: No matches (all should now have `apps/api/` or `packages/core/` prefix)

**Step 5: Verify no old `tests/` paths remain (without apps/api prefix)**

Run:
```bash
grep -nP '\(tests/' README.md
```
Expected: No matches

**Step 6: Run build to verify everything compiles**

Run:
```bash
pnpm turbo build
```
Expected: Build succeeds

**Step 7: Commit any final fixes if needed**

If any issues found in verification steps, fix and commit:
```bash
git add README.md
git commit -m "docs: fix remaining README path/reference issues"
```
