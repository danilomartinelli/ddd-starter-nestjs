# Phase 2: Test Coverage — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add comprehensive test coverage across all layers — core framework, domain entities, application handlers, and infrastructure — serving as documentation-first teaching tools for DDD patterns.

**Architecture:** Bottom-up approach: `packages/testing` toolkit → `@repo/core` base class tests → domain layer tests → application layer BDD tests → infrastructure integration tests. Each layer builds on the previous. `RequestContextService` must be mocked globally since it depends on HTTP request context.

**Tech Stack:** Jest 29, ts-jest, jest-cucumber (BDD for app layer), neverthrow (Result matchers), Slonik + Zod (infra tests), Docker Postgres (integration tests)

---

### Task 1: Create `packages/testing` Workspace Scaffold

**Files:**
- Create: `packages/testing/package.json`
- Create: `packages/testing/tsconfig.json`
- Create: `packages/testing/src/index.ts`
- Create: `packages/testing/src/setup/mock-request-context.ts`

**Step 1: Create package.json**

```json
{
  "name": "@repo/testing",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {},
  "dependencies": {
    "@repo/core": "workspace:*",
    "neverthrow": "^8.2.0"
  },
  "devDependencies": {
    "@types/jest": "29.5.14",
    "typescript": "^5.9.3"
  }
}
```

**Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "commonjs",
    "declaration": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "strictPropertyInitialization": false,
    "target": "es2022",
    "useDefineForClassFields": false,
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "composite": true,
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": false,
    "noFallthroughCasesInSwitch": false
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create the global RequestContextService mock**

This is critical — `ExceptionBase`, `Command`, `DomainEvent`, and `SqlRepositoryBase` all call `RequestContextService.getContext()` or `getRequestId()` which requires an active HTTP request context. Without this mock, almost every test fails.

Create `packages/testing/src/setup/mock-request-context.ts`:

```typescript
/**
 * Global mock for nestjs-request-context.
 * Must be loaded via jest setupFilesAfterEnv to prevent RequestContextService
 * from throwing "Cannot read properties of undefined" errors in unit tests.
 */
jest.mock('nestjs-request-context', () => ({
  RequestContext: {
    currentContext: {
      req: {
        requestId: 'test-request-id',
        transactionConnection: undefined,
      },
    },
  },
}));
```

**Step 4: Create initial index.ts**

```typescript
// @repo/testing — shared test toolkit
// Exports are added incrementally as utilities are built

export { InMemoryRepository } from './fakes/in-memory-repository';
export { FakeEventBus } from './fakes/fake-event-bus';
```

Note: this will be updated incrementally. For now, leave it as a placeholder:

```typescript
// @repo/testing — shared test toolkit
// Exports are added incrementally as utilities are built
```

**Step 5: Install dependencies**

Run: `pnpm install`

**Step 6: Commit**

```bash
git add packages/testing/
git commit -m "feat(testing): scaffold packages/testing workspace with request context mock"
```

---

### Task 2: Add Jest Config for `packages/core`

**Files:**
- Create: `packages/core/jest.config.json`
- Create: `packages/core/jest.setup.ts`
- Modify: `packages/core/package.json` (add test script)
- Modify: `turbo.json` (ensure test task works for core)

**Step 1: Create jest.config.json**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".spec.ts$",
  "coverageDirectory": "./coverage",
  "setupFilesAfterEnv": ["./jest.setup.ts"],
  "transform": {
    "^.+\\.ts$": ["ts-jest", {
      "tsconfig": {
        "allowJs": true,
        "esModuleInterop": true
      }
    }]
  }
}
```

**Step 2: Create jest.setup.ts**

```typescript
// Mock nestjs-request-context globally for all core tests.
// RequestContextService.getContext() is called by ExceptionBase, Command,
// DomainEvent, and SqlRepositoryBase constructors.
jest.mock('nestjs-request-context', () => ({
  RequestContext: {
    currentContext: {
      req: {
        requestId: 'test-request-id',
        transactionConnection: undefined,
      },
    },
  },
}));
```

**Step 3: Add test script to packages/core/package.json**

Add to `"scripts"`:
```json
"test": "jest --config jest.config.json"
```

**Step 4: Add jest devDependencies to packages/core/package.json**

Add to `"devDependencies"`:
```json
"@types/jest": "29.5.14",
"jest": "29.7.0",
"ts-jest": "29.4.6"
```

**Step 5: Install and verify**

Run: `pnpm install`
Run: `cd packages/core && pnpm test -- --passWithNoTests`
Expected: "No tests found" or pass with no tests

**Step 6: Commit**

```bash
git add packages/core/jest.config.json packages/core/jest.setup.ts packages/core/package.json pnpm-lock.yaml
git commit -m "feat(core): add jest configuration for unit tests"
```

---

### Task 3: Core Tests — Guard Utility

**Files:**
- Create: `packages/core/src/__tests__/guard.spec.ts`

**Step 1: Write the tests**

```typescript
import { Guard } from '../guard';

describe('Guard', () => {
  describe('isEmpty', () => {
    it('returns true for null', () => {
      expect(Guard.isEmpty(null)).toBe(true);
    });

    it('returns true for undefined', () => {
      expect(Guard.isEmpty(undefined)).toBe(true);
    });

    it('returns true for empty string', () => {
      expect(Guard.isEmpty('')).toBe(true);
    });

    it('returns true for empty object', () => {
      expect(Guard.isEmpty({})).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(Guard.isEmpty([])).toBe(true);
    });

    it('returns true for array of empty values', () => {
      expect(Guard.isEmpty([undefined, null, ''])).toBe(true);
    });

    it('returns false for non-empty string', () => {
      expect(Guard.isEmpty('hello')).toBe(false);
    });

    it('returns false for number (including 0)', () => {
      expect(Guard.isEmpty(0)).toBe(false);
      expect(Guard.isEmpty(42)).toBe(false);
    });

    it('returns false for boolean (including false)', () => {
      expect(Guard.isEmpty(false)).toBe(false);
      expect(Guard.isEmpty(true)).toBe(false);
    });

    it('returns false for Date', () => {
      expect(Guard.isEmpty(new Date())).toBe(false);
    });

    it('returns false for non-empty object', () => {
      expect(Guard.isEmpty({ key: 'value' })).toBe(false);
    });

    it('returns false for non-empty array', () => {
      expect(Guard.isEmpty([1, 2, 3])).toBe(false);
    });
  });

  describe('lengthIsBetween', () => {
    it('returns true for string at exact minimum length', () => {
      expect(Guard.lengthIsBetween('ab', 2, 5)).toBe(true);
    });

    it('returns true for string at exact maximum length', () => {
      expect(Guard.lengthIsBetween('abcde', 2, 5)).toBe(true);
    });

    it('returns true for string within range', () => {
      expect(Guard.lengthIsBetween('abc', 2, 5)).toBe(true);
    });

    it('returns false for string below minimum', () => {
      expect(Guard.lengthIsBetween('a', 2, 5)).toBe(false);
    });

    it('returns false for string above maximum', () => {
      expect(Guard.lengthIsBetween('abcdef', 2, 5)).toBe(false);
    });

    it('works with arrays', () => {
      expect(Guard.lengthIsBetween([1, 2], 2, 5)).toBe(true);
      expect(Guard.lengthIsBetween([1], 2, 5)).toBe(false);
    });

    it('works with numbers (checks digit count)', () => {
      expect(Guard.lengthIsBetween(123, 2, 5)).toBe(true);
      expect(Guard.lengthIsBetween(1, 2, 5)).toBe(false);
    });

    it('throws for empty value', () => {
      expect(() => Guard.lengthIsBetween('', 2, 5)).toThrow(
        'Cannot check length of a value. Provided value is empty',
      );
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd packages/core && pnpm test -- src/__tests__/guard.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/core/src/__tests__/guard.spec.ts
git commit -m "test(core): add Guard utility tests"
```

---

### Task 4: Core Tests — Exception Classes

**Files:**
- Create: `packages/core/src/__tests__/exceptions.spec.ts`

**Step 1: Write the tests**

```typescript
import {
  ArgumentInvalidException,
  ArgumentNotProvidedException,
  ArgumentOutOfRangeException,
  ConflictException,
  NotFoundException,
  InternalServerErrorException,
} from '../exceptions';
import {
  ARGUMENT_INVALID,
  ARGUMENT_NOT_PROVIDED,
  ARGUMENT_OUT_OF_RANGE,
  CONFLICT,
  NOT_FOUND,
  INTERNAL_SERVER_ERROR,
} from '../exceptions/exception.codes';

describe('Exception classes', () => {
  describe('ArgumentInvalidException', () => {
    it('has correct code', () => {
      const error = new ArgumentInvalidException('invalid arg');
      expect(error.code).toBe(ARGUMENT_INVALID);
    });

    it('preserves message', () => {
      const error = new ArgumentInvalidException('test message');
      expect(error.message).toBe('test message');
    });

    it('is an instance of Error', () => {
      const error = new ArgumentInvalidException('test');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ArgumentNotProvidedException', () => {
    it('has correct code', () => {
      const error = new ArgumentNotProvidedException('not provided');
      expect(error.code).toBe(ARGUMENT_NOT_PROVIDED);
    });
  });

  describe('ArgumentOutOfRangeException', () => {
    it('has correct code', () => {
      const error = new ArgumentOutOfRangeException('out of range');
      expect(error.code).toBe(ARGUMENT_OUT_OF_RANGE);
    });
  });

  describe('ConflictException', () => {
    it('has correct code', () => {
      const error = new ConflictException('conflict');
      expect(error.code).toBe(CONFLICT);
    });

    it('preserves cause', () => {
      const cause = new Error('original');
      const error = new ConflictException('conflict', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('NotFoundException', () => {
    it('has correct code', () => {
      const error = new NotFoundException();
      expect(error.code).toBe(NOT_FOUND);
    });

    it('uses default message when none provided', () => {
      const error = new NotFoundException();
      expect(error.message).toBe('Not found');
    });

    it('accepts custom message', () => {
      const error = new NotFoundException('User not found');
      expect(error.message).toBe('User not found');
    });
  });

  describe('InternalServerErrorException', () => {
    it('has correct code', () => {
      const error = new InternalServerErrorException();
      expect(error.code).toBe(INTERNAL_SERVER_ERROR);
    });

    it('uses default message when none provided', () => {
      const error = new InternalServerErrorException();
      expect(error.message).toBe('Internal server error');
    });
  });

  describe('ExceptionBase (tested via concrete class)', () => {
    it('has correlationId from request context', () => {
      const error = new NotFoundException();
      expect(error.correlationId).toBe('test-request-id');
    });

    it('serializes to JSON correctly', () => {
      const cause = new Error('root cause');
      const error = new ConflictException('conflict', cause, {
        field: 'email',
      });
      const json = error.toJSON();

      expect(json).toEqual({
        message: 'conflict',
        code: CONFLICT,
        correlationId: 'test-request-id',
        stack: expect.any(String),
        cause: expect.any(String),
        metadata: { field: 'email' },
      });
    });

    it('preserves metadata', () => {
      const error = new ConflictException('conflict', undefined, {
        entity: 'User',
      });
      expect(error.metadata).toEqual({ entity: 'User' });
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd packages/core && pnpm test -- src/__tests__/exceptions.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/core/src/__tests__/exceptions.spec.ts
git commit -m "test(core): add exception class tests"
```

---

### Task 5: Core Tests — ValueObject Base

**Files:**
- Create: `packages/core/src/__tests__/value-object.spec.ts`

**Step 1: Write the tests**

```typescript
import { ValueObject } from '../ddd/value-object.base';
import { ArgumentNotProvidedException } from '../exceptions';

// Test double: multi-property VO
interface TestAddressProps {
  street: string;
  city: string;
}

class TestAddress extends ValueObject<TestAddressProps> {
  protected validate(props: TestAddressProps): void {
    // no-op for base class testing
  }
}

// Test double: domain primitive VO (single value)
class TestEmail extends ValueObject<string> {
  protected validate(props: { value: string }): void {
    // no-op for base class testing
  }
}

describe('ValueObject', () => {
  describe('construction', () => {
    it('creates a multi-property value object', () => {
      const address = new TestAddress({ street: '123 Main', city: 'Springfield' });
      expect(address.unpack()).toEqual({ street: '123 Main', city: 'Springfield' });
    });

    it('creates a domain primitive value object', () => {
      const email = new TestEmail({ value: 'test@example.com' });
      expect(email.unpack()).toBe('test@example.com');
    });

    it('throws when props are empty (null)', () => {
      expect(() => new TestAddress(null as any)).toThrow(
        ArgumentNotProvidedException,
      );
    });

    it('throws when props are undefined', () => {
      expect(() => new TestAddress(undefined as any)).toThrow(
        ArgumentNotProvidedException,
      );
    });

    it('throws when domain primitive value is empty', () => {
      expect(() => new TestEmail({ value: '' })).toThrow(
        ArgumentNotProvidedException,
      );
    });
  });

  describe('equality', () => {
    it('two VOs with same props are equal', () => {
      const a = new TestAddress({ street: '123 Main', city: 'Springfield' });
      const b = new TestAddress({ street: '123 Main', city: 'Springfield' });
      expect(a.equals(b)).toBe(true);
    });

    it('two VOs with different props are not equal', () => {
      const a = new TestAddress({ street: '123 Main', city: 'Springfield' });
      const b = new TestAddress({ street: '456 Oak', city: 'Shelbyville' });
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for null', () => {
      const a = new TestAddress({ street: '123 Main', city: 'Springfield' });
      expect(a.equals(null as any)).toBe(false);
    });

    it('returns false for undefined', () => {
      const a = new TestAddress({ street: '123 Main', city: 'Springfield' });
      expect(a.equals(undefined)).toBe(false);
    });
  });

  describe('unpack', () => {
    it('returns frozen props for multi-property VO', () => {
      const address = new TestAddress({ street: '123 Main', city: 'Springfield' });
      const unpacked = address.unpack();
      expect(Object.isFrozen(unpacked)).toBe(true);
    });

    it('returns raw value for domain primitive', () => {
      const email = new TestEmail({ value: 'test@example.com' });
      expect(email.unpack()).toBe('test@example.com');
    });
  });

  describe('isValueObject', () => {
    it('returns true for ValueObject instances', () => {
      const address = new TestAddress({ street: '123 Main', city: 'Springfield' });
      expect(ValueObject.isValueObject(address)).toBe(true);
    });

    it('returns false for plain objects', () => {
      expect(ValueObject.isValueObject({ street: '123 Main' })).toBe(false);
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd packages/core && pnpm test -- src/__tests__/value-object.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/core/src/__tests__/value-object.spec.ts
git commit -m "test(core): add ValueObject base class tests"
```

---

### Task 6: Core Tests — Entity & AggregateRoot Base

**Files:**
- Create: `packages/core/src/__tests__/entity-and-aggregate-root.spec.ts`

**Step 1: Write the tests**

```typescript
import { AggregateRoot } from '../ddd/aggregate-root.base';
import { Entity } from '../ddd/entity.base';
import { DomainEvent, DomainEventProps } from '../ddd/domain-event.base';
import {
  ArgumentNotProvidedException,
  ArgumentInvalidException,
  ArgumentOutOfRangeException,
} from '../exceptions';

// --- Test doubles ---

interface TestEntityProps {
  name: string;
  value: number;
}

class TestDomainEvent extends DomainEvent {
  readonly name: string;
  constructor(props: DomainEventProps<TestDomainEvent>) {
    super(props);
    this.name = props.name;
  }
}

class TestAggregate extends AggregateRoot<TestEntityProps> {
  protected readonly _id: string;

  validate(): void {
    // invariant check placeholder
  }

  // Expose addEvent for testing
  emitTestEvent(name: string): void {
    this.addEvent(
      new TestDomainEvent({ aggregateId: this.id, name }),
    );
  }
}

// Concrete entity (non-aggregate) for Entity base tests
class TestEntity extends AggregateRoot<TestEntityProps> {
  protected readonly _id: string;
  validate(): void {}
}

describe('Entity', () => {
  const validProps = { name: 'test', value: 42 };

  describe('construction', () => {
    it('assigns the provided id', () => {
      const entity = new TestEntity({ id: 'entity-1', props: validProps });
      expect(entity.id).toBe('entity-1');
    });

    it('sets createdAt and updatedAt to now when not provided', () => {
      const before = new Date();
      const entity = new TestEntity({ id: 'entity-1', props: validProps });
      const after = new Date();

      expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(entity.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('uses provided createdAt and updatedAt', () => {
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-06-01');
      const entity = new TestEntity({
        id: 'entity-1',
        props: validProps,
        createdAt,
        updatedAt,
      });
      expect(entity.createdAt).toBe(createdAt);
      expect(entity.updatedAt).toBe(updatedAt);
    });

    it('calls validate() on construction', () => {
      const validateSpy = jest.spyOn(TestEntity.prototype, 'validate');
      new TestEntity({ id: 'entity-1', props: validProps });
      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it('throws when props are empty', () => {
      expect(
        () => new TestEntity({ id: 'entity-1', props: null as any }),
      ).toThrow(ArgumentNotProvidedException);
    });

    it('throws when props is not an object', () => {
      expect(
        () => new TestEntity({ id: 'entity-1', props: 'string' as any }),
      ).toThrow(ArgumentInvalidException);
    });

    it('throws when props has more than 50 properties', () => {
      const bigProps: any = {};
      for (let i = 0; i < 51; i++) {
        bigProps[`prop${i}`] = i;
      }
      expect(
        () => new TestEntity({ id: 'entity-1', props: bigProps }),
      ).toThrow(ArgumentOutOfRangeException);
    });
  });

  describe('equality', () => {
    it('two entities with same ID are equal', () => {
      const a = new TestEntity({ id: 'same-id', props: { name: 'A', value: 1 } });
      const b = new TestEntity({ id: 'same-id', props: { name: 'B', value: 2 } });
      expect(a.equals(b)).toBe(true);
    });

    it('two entities with different IDs are not equal', () => {
      const a = new TestEntity({ id: 'id-1', props: validProps });
      const b = new TestEntity({ id: 'id-2', props: validProps });
      expect(a.equals(b)).toBe(false);
    });

    it('returns false for null', () => {
      const a = new TestEntity({ id: 'id-1', props: validProps });
      expect(a.equals(null as any)).toBe(false);
    });

    it('returns false for undefined', () => {
      const a = new TestEntity({ id: 'id-1', props: validProps });
      expect(a.equals(undefined as any)).toBe(false);
    });

    it('returns true for same reference', () => {
      const a = new TestEntity({ id: 'id-1', props: validProps });
      expect(a.equals(a)).toBe(true);
    });
  });

  describe('getProps', () => {
    it('returns id, createdAt, updatedAt, and entity props', () => {
      const entity = new TestEntity({ id: 'entity-1', props: validProps });
      const result = entity.getProps();

      expect(result.id).toBe('entity-1');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.name).toBe('test');
      expect(result.value).toBe(42);
    });

    it('returns a frozen object', () => {
      const entity = new TestEntity({ id: 'entity-1', props: validProps });
      const props = entity.getProps();
      expect(Object.isFrozen(props)).toBe(true);
    });
  });

  describe('isEntity', () => {
    it('returns true for Entity instances', () => {
      const entity = new TestEntity({ id: 'entity-1', props: validProps });
      expect(Entity.isEntity(entity)).toBe(true);
    });

    it('returns false for plain objects', () => {
      expect(Entity.isEntity({ id: '1' })).toBe(false);
    });
  });
});

describe('AggregateRoot', () => {
  const validProps = { name: 'test', value: 42 };

  describe('domain events', () => {
    it('starts with empty domain events', () => {
      const aggregate = new TestAggregate({ id: 'agg-1', props: validProps });
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('addEvent stores domain events', () => {
      const aggregate = new TestAggregate({ id: 'agg-1', props: validProps });
      aggregate.emitTestEvent('something happened');
      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]).toBeInstanceOf(TestDomainEvent);
    });

    it('accumulates multiple events', () => {
      const aggregate = new TestAggregate({ id: 'agg-1', props: validProps });
      aggregate.emitTestEvent('first');
      aggregate.emitTestEvent('second');
      expect(aggregate.domainEvents).toHaveLength(2);
    });

    it('clearEvents removes all events', () => {
      const aggregate = new TestAggregate({ id: 'agg-1', props: validProps });
      aggregate.emitTestEvent('event');
      aggregate.clearEvents();
      expect(aggregate.domainEvents).toEqual([]);
    });

    it('publishEvents publishes and clears events', async () => {
      const aggregate = new TestAggregate({ id: 'agg-1', props: validProps });
      aggregate.emitTestEvent('event');

      const mockLogger = { debug: jest.fn(), log: jest.fn(), error: jest.fn(), warn: jest.fn() };
      const mockEmitter = { emitAsync: jest.fn().mockResolvedValue([]) } as any;

      await aggregate.publishEvents(mockLogger, mockEmitter);

      expect(mockEmitter.emitAsync).toHaveBeenCalledWith(
        'TestDomainEvent',
        expect.any(TestDomainEvent),
      );
      expect(aggregate.domainEvents).toEqual([]);
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd packages/core && pnpm test -- src/__tests__/entity-and-aggregate-root.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add packages/core/src/__tests__/entity-and-aggregate-root.spec.ts
git commit -m "test(core): add Entity and AggregateRoot base class tests"
```

---

### Task 7: Core Tests — DomainEvent, Command, Query

**Files:**
- Create: `packages/core/src/__tests__/domain-event.spec.ts`
- Create: `packages/core/src/__tests__/command.spec.ts`
- Create: `packages/core/src/__tests__/query.spec.ts`

**Step 1: Write DomainEvent tests**

```typescript
import { DomainEvent, DomainEventProps } from '../ddd/domain-event.base';
import { ArgumentNotProvidedException } from '../exceptions';

class TestEvent extends DomainEvent {
  readonly payload: string;
  constructor(props: DomainEventProps<TestEvent>) {
    super(props);
    this.payload = props.payload;
  }
}

describe('DomainEvent', () => {
  it('generates a unique id', () => {
    const event = new TestEvent({ aggregateId: 'agg-1', payload: 'test' });
    expect(event.id).toBeDefined();
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
  });

  it('stores the aggregateId', () => {
    const event = new TestEvent({ aggregateId: 'agg-1', payload: 'test' });
    expect(event.aggregateId).toBe('agg-1');
  });

  it('sets metadata with default timestamp', () => {
    const before = Date.now();
    const event = new TestEvent({ aggregateId: 'agg-1', payload: 'test' });
    expect(event.metadata.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.metadata.correlationId).toBe('test-request-id');
  });

  it('accepts custom metadata', () => {
    const event = new TestEvent({
      aggregateId: 'agg-1',
      payload: 'test',
      metadata: {
        correlationId: 'custom-corr',
        causationId: 'custom-cause',
        timestamp: 1234567890,
        userId: 'user-1',
      },
    });
    expect(event.metadata.correlationId).toBe('custom-corr');
    expect(event.metadata.causationId).toBe('custom-cause');
    expect(event.metadata.timestamp).toBe(1234567890);
    expect(event.metadata.userId).toBe('user-1');
  });

  it('preserves custom properties', () => {
    const event = new TestEvent({ aggregateId: 'agg-1', payload: 'my-data' });
    expect(event.payload).toBe('my-data');
  });

  it('generates unique IDs for each event', () => {
    const a = new TestEvent({ aggregateId: 'agg-1', payload: 'a' });
    const b = new TestEvent({ aggregateId: 'agg-1', payload: 'b' });
    expect(a.id).not.toBe(b.id);
  });

  it('throws for empty props', () => {
    expect(() => new TestEvent(null as any)).toThrow(
      ArgumentNotProvidedException,
    );
  });
});
```

**Step 2: Write Command tests**

```typescript
import { Command, CommandProps } from '../ddd/command.base';
import { ArgumentNotProvidedException } from '../exceptions';

class TestCommand extends Command {
  readonly name: string;
  constructor(props: CommandProps<TestCommand>) {
    super(props);
    this.name = props.name;
  }
}

describe('Command', () => {
  it('generates a unique id', () => {
    const cmd = new TestCommand({ name: 'test' });
    expect(cmd.id).toBeDefined();
    expect(typeof cmd.id).toBe('string');
  });

  it('accepts a provided id', () => {
    const cmd = new TestCommand({ id: 'custom-id', name: 'test' });
    expect(cmd.id).toBe('custom-id');
  });

  it('sets metadata with default timestamp', () => {
    const before = Date.now();
    const cmd = new TestCommand({ name: 'test' });
    expect(cmd.metadata.timestamp).toBeGreaterThanOrEqual(before);
    expect(cmd.metadata.correlationId).toBe('test-request-id');
  });

  it('accepts custom metadata', () => {
    const cmd = new TestCommand({
      name: 'test',
      metadata: {
        correlationId: 'custom-corr',
        causationId: 'custom-cause',
        timestamp: 9999999,
        userId: 'user-1',
      },
    });
    expect(cmd.metadata.correlationId).toBe('custom-corr');
    expect(cmd.metadata.causationId).toBe('custom-cause');
  });

  it('preserves custom properties', () => {
    const cmd = new TestCommand({ name: 'do-something' });
    expect(cmd.name).toBe('do-something');
  });

  it('throws for empty props', () => {
    expect(() => new TestCommand(null as any)).toThrow(
      ArgumentNotProvidedException,
    );
  });
});
```

**Step 3: Write Query tests**

```typescript
import { PaginatedQueryBase, PaginatedParams } from '../ddd/query.base';

class TestQuery extends PaginatedQueryBase {
  readonly filter?: string;
  constructor(props: PaginatedParams<TestQuery>) {
    super(props);
    this.filter = props.filter;
  }
}

describe('PaginatedQueryBase', () => {
  it('uses default limit of 20 when not provided', () => {
    const query = new TestQuery({});
    expect(query.limit).toBe(20);
  });

  it('accepts custom limit', () => {
    const query = new TestQuery({ limit: 50 });
    expect(query.limit).toBe(50);
  });

  it('calculates offset from page and limit', () => {
    const query = new TestQuery({ page: 2, limit: 10 });
    expect(query.offset).toBe(20); // page 2 * limit 10
  });

  it('defaults to page 0 and offset 0', () => {
    const query = new TestQuery({});
    expect(query.page).toBe(0);
    expect(query.offset).toBe(0);
  });

  it('uses default orderBy when not provided', () => {
    const query = new TestQuery({});
    expect(query.orderBy).toEqual({ field: true, param: 'desc' });
  });

  it('accepts custom orderBy', () => {
    const query = new TestQuery({ orderBy: { field: 'name', param: 'asc' } });
    expect(query.orderBy).toEqual({ field: 'name', param: 'asc' });
  });

  it('preserves custom properties', () => {
    const query = new TestQuery({ filter: 'active' });
    expect(query.filter).toBe('active');
  });
});
```

**Step 4: Run all tests**

Run: `cd packages/core && pnpm test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add packages/core/src/__tests__/domain-event.spec.ts packages/core/src/__tests__/command.spec.ts packages/core/src/__tests__/query.spec.ts
git commit -m "test(core): add DomainEvent, Command, and Query base class tests"
```

---

### Task 8: Custom Jest Matchers in `packages/testing`

**Files:**
- Create: `packages/testing/src/matchers/neverthrow-matchers.ts`
- Create: `packages/testing/src/matchers/domain-event-matchers.ts`
- Create: `packages/testing/src/matchers/index.ts`
- Modify: `packages/testing/src/index.ts`

**Step 1: Write neverthrow matchers**

Create `packages/testing/src/matchers/neverthrow-matchers.ts`:

```typescript
import { Result } from 'neverthrow';

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOkResult(expected?: unknown): R;
      toBeErrResult(expectedType?: new (...args: any[]) => Error): R;
    }
  }
}

expect.extend({
  toBeOkResult(received: Result<unknown, unknown>, expected?: unknown) {
    if (!received || typeof received.isOk !== 'function') {
      return {
        pass: false,
        message: () => `Expected a Result object but received ${typeof received}`,
      };
    }

    const isOk = received.isOk();
    if (!isOk) {
      return {
        pass: false,
        message: () =>
          `Expected Result to be Ok, but it was Err: ${JSON.stringify(
            received.isErr() ? (received as any)._unsafeUnwrapErr() : received,
          )}`,
      };
    }

    if (expected !== undefined) {
      const value = (received as any)._unsafeUnwrap();
      const matches = this.equals(value, expected);
      return {
        pass: matches,
        message: () =>
          `Expected Ok value ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`,
      };
    }

    return { pass: true, message: () => 'Expected Result not to be Ok' };
  },

  toBeErrResult(
    received: Result<unknown, unknown>,
    expectedType?: new (...args: any[]) => Error,
  ) {
    if (!received || typeof received.isErr !== 'function') {
      return {
        pass: false,
        message: () => `Expected a Result object but received ${typeof received}`,
      };
    }

    const isErr = received.isErr();
    if (!isErr) {
      return {
        pass: false,
        message: () => `Expected Result to be Err, but it was Ok`,
      };
    }

    if (expectedType) {
      const error = (received as any)._unsafeUnwrapErr();
      const matches = error instanceof expectedType;
      return {
        pass: matches,
        message: () =>
          `Expected Err to be instance of ${expectedType.name}, but got ${error?.constructor?.name}`,
      };
    }

    return { pass: true, message: () => 'Expected Result not to be Err' };
  },
});
```

**Step 2: Write domain event matchers**

Create `packages/testing/src/matchers/domain-event-matchers.ts`:

```typescript
import { AggregateRoot, DomainEvent } from '@repo/core';

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveDomainEvent(eventClass: new (...args: any[]) => DomainEvent): R;
      toHaveDomainEventMatching(
        eventClass: new (...args: any[]) => DomainEvent,
        partialPayload: Record<string, unknown>,
      ): R;
    }
  }
}

expect.extend({
  toHaveDomainEvent(
    received: AggregateRoot<any>,
    eventClass: new (...args: any[]) => DomainEvent,
  ) {
    const events = received.domainEvents;
    const found = events.some((e) => e instanceof eventClass);
    return {
      pass: found,
      message: () =>
        found
          ? `Expected aggregate NOT to have ${eventClass.name} event`
          : `Expected aggregate to have ${eventClass.name} event, but found: [${events.map((e) => e.constructor.name).join(', ')}]`,
    };
  },

  toHaveDomainEventMatching(
    received: AggregateRoot<any>,
    eventClass: new (...args: any[]) => DomainEvent,
    partialPayload: Record<string, unknown>,
  ) {
    const events = received.domainEvents;
    const matching = events.find(
      (e) =>
        e instanceof eventClass &&
        Object.entries(partialPayload).every(
          ([key, value]) => (e as any)[key] === value,
        ),
    );
    return {
      pass: !!matching,
      message: () =>
        matching
          ? `Expected aggregate NOT to have matching ${eventClass.name} event`
          : `Expected aggregate to have ${eventClass.name} matching ${JSON.stringify(partialPayload)}`,
    };
  },
});
```

**Step 3: Create matchers index**

Create `packages/testing/src/matchers/index.ts`:

```typescript
import './neverthrow-matchers';
import './domain-event-matchers';
```

**Step 4: Update packages/testing/src/index.ts**

```typescript
// @repo/testing — shared test toolkit
// Import this file in jest setupFilesAfterEnv to register matchers
export * from './matchers';
```

**Step 5: Commit**

```bash
git add packages/testing/src/
git commit -m "feat(testing): add custom Jest matchers for neverthrow Results and domain events"
```

---

### Task 9: Entity Factories & Builders in `packages/testing`

**Files:**
- Create: `packages/testing/src/factories/user.factory.ts`
- Create: `packages/testing/src/factories/wallet.factory.ts`
- Create: `packages/testing/src/factories/index.ts`
- Create: `packages/testing/src/builders/user.builder.ts`
- Create: `packages/testing/src/builders/index.ts`
- Modify: `packages/testing/src/index.ts`
- Modify: `packages/testing/package.json` (add @repo/api as dev dep — or use relative imports)

**Important:** Factories need access to app-level entity classes (`UserEntity`, `WalletEntity`, `Address`). Since `packages/testing` is a workspace package and these entities are in `apps/api`, we have two options:
1. Add `@repo/api` as a dependency (creates circular potential)
2. Have factories in `apps/api` tests that import from `@repo/testing` for utilities only

**Recommended:** Keep entity-specific factories in `apps/api/tests/factories/` and only put generic utilities in `packages/testing`. This avoids cross-workspace coupling.

**Step 1: Create generic factory utilities in packages/testing**

Create `packages/testing/src/factories/index.ts`:

```typescript
import { randomUUID } from 'crypto';

/**
 * Generate default base entity props for test doubles.
 */
export function createBaseEntityProps(overrides?: {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  const now = new Date();
  return {
    id: overrides?.id ?? randomUUID(),
    createdAt: overrides?.createdAt ?? now,
    updatedAt: overrides?.updatedAt ?? now,
  };
}
```

**Step 2: Create entity-specific factories in apps/api**

Create `apps/api/tests/factories/user.factory.ts`:

```typescript
import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { UserRoles } from '@modules/user/domain/user.types';

export interface CreateTestUserOverrides {
  email?: string;
  country?: string;
  postalCode?: string;
  street?: string;
}

export function createTestAddress(overrides?: Partial<{ country: string; postalCode: string; street: string }>) {
  return new Address({
    country: overrides?.country ?? 'England',
    postalCode: overrides?.postalCode ?? '28566',
    street: overrides?.street ?? 'Grand Avenue',
  });
}

export function createTestUser(overrides?: CreateTestUserOverrides): UserEntity {
  return UserEntity.create({
    email: overrides?.email ?? 'test@example.com',
    address: createTestAddress(overrides),
  });
}
```

Create `apps/api/tests/factories/wallet.factory.ts`:

```typescript
import { WalletEntity } from '@modules/wallet/domain/wallet.entity';
import { randomUUID } from 'crypto';

export interface CreateTestWalletOverrides {
  userId?: string;
}

export function createTestWallet(overrides?: CreateTestWalletOverrides): WalletEntity {
  return WalletEntity.create({
    userId: overrides?.userId ?? randomUUID(),
  });
}
```

Create `apps/api/tests/factories/index.ts`:

```typescript
export { createTestUser, createTestAddress } from './user.factory';
export type { CreateTestUserOverrides } from './user.factory';
export { createTestWallet } from './wallet.factory';
export type { CreateTestWalletOverrides } from './wallet.factory';
```

**Step 3: Create user builder in apps/api**

Create `apps/api/tests/builders/user.builder.ts`:

```typescript
import { UserEntity } from '@modules/user/domain/user.entity';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { UserRoles } from '@modules/user/domain/user.types';

export class UserBuilder {
  private email = 'test@example.com';
  private country = 'England';
  private postalCode = '28566';
  private street = 'Grand Avenue';
  private role?: UserRoles;

  withEmail(email: string): this {
    this.email = email;
    return this;
  }

  withCountry(country: string): this {
    this.country = country;
    return this;
  }

  withPostalCode(postalCode: string): this {
    this.postalCode = postalCode;
    return this;
  }

  withStreet(street: string): this {
    this.street = street;
    return this;
  }

  withRole(role: UserRoles): this {
    this.role = role;
    return this;
  }

  build(): UserEntity {
    const user = UserEntity.create({
      email: this.email,
      address: new Address({
        country: this.country,
        postalCode: this.postalCode,
        street: this.street,
      }),
    });

    if (this.role === UserRoles.admin) user.makeAdmin();
    if (this.role === UserRoles.moderator) user.makeModerator();

    return user;
  }
}
```

Create `apps/api/tests/builders/index.ts`:

```typescript
export { UserBuilder } from './user.builder';
```

**Step 4: Update packages/testing/src/index.ts**

```typescript
// @repo/testing — shared test toolkit

// Matchers — import in setupFilesAfterEnv
export * from './matchers';

// Generic factories
export { createBaseEntityProps } from './factories';
```

**Step 5: Commit**

```bash
git add packages/testing/src/ apps/api/tests/factories/ apps/api/tests/builders/
git commit -m "feat(testing): add entity factories and builders"
```

---

### Task 10: Domain Tests — Address Value Object & Domain Errors

**Files:**
- Create: `apps/api/src/modules/user/domain/value-objects/address.value-object.spec.ts`
- Create: `apps/api/src/modules/user/domain/user.errors.spec.ts`
- Create: `apps/api/src/modules/wallet/domain/wallet.errors.spec.ts`

**Pre-requisite:** Fix `.jestrc.json` for unit tests first (remove full app bootstrap). We need to do a minimal config fix so unit tests can run without booting NestJS.

**Step 1: Create a lightweight unit test setup**

Create `apps/api/tests/setup/jest-unit-setup.ts`:

```typescript
/**
 * Unit test setup — mocks nestjs-request-context so that
 * ExceptionBase, Command, DomainEvent constructors don't throw.
 * Does NOT bootstrap the NestJS application or connect to a database.
 */
jest.mock('nestjs-request-context', () => ({
  RequestContext: {
    currentContext: {
      req: {
        requestId: 'test-request-id',
        transactionConnection: undefined,
      },
    },
  },
}));
```

**Step 2: Update .jestrc.json for unit tests**

Modify `apps/api/.jestrc.json` — replace `setupFilesAfterEnv` and remove `globalSetup`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "coverageDirectory": "./tests/coverage",
  "setupFilesAfterEnv": ["./tests/setup/jest-unit-setup.ts"],
  "testRegex": ".spec.ts$",
  "testPathIgnorePatterns": ["\\.integration-spec\\.ts$", "\\.e2e-spec\\.ts$", "node_modules"],
  "moduleNameMapper": {
    "@src/(.*)$": "<rootDir>/src/$1",
    "@modules/(.*)$": "<rootDir>/src/modules/$1",
    "@config/(.*)$": "<rootDir>/src/configs/$1",
    "@tests/(.*)$": "<rootDir>/tests/$1",
    "@repo/core/src/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "@repo/core": "<rootDir>/../../packages/core/src/index.ts"
  },
  "transformIgnorePatterns": [],
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", {
      "tsconfig": {
        "allowJs": true,
        "esModuleInterop": true
      }
    }]
  }
}
```

**Step 3: Write Address VO tests**

Create `apps/api/src/modules/user/domain/value-objects/address.value-object.spec.ts`:

```typescript
import { ArgumentOutOfRangeException } from '@repo/core';
import { Address } from './address.value-object';

describe('Address', () => {
  const validProps = { country: 'England', postalCode: '28566', street: 'Grand Avenue' };

  describe('creation', () => {
    it('creates with valid props', () => {
      const address = new Address(validProps);
      expect(address.country).toBe('England');
      expect(address.postalCode).toBe('28566');
      expect(address.street).toBe('Grand Avenue');
    });

    it('unpacks to props object', () => {
      const address = new Address(validProps);
      expect(address.unpack()).toEqual(validProps);
    });
  });

  describe('validation — country', () => {
    it('accepts country at minimum length (2 chars)', () => {
      expect(() => new Address({ ...validProps, country: 'UK' })).not.toThrow();
    });

    it('accepts country at maximum length (50 chars)', () => {
      expect(() => new Address({ ...validProps, country: 'A'.repeat(50) })).not.toThrow();
    });

    it('rejects country shorter than 2 chars', () => {
      expect(() => new Address({ ...validProps, country: 'A' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });

    it('rejects country longer than 50 chars', () => {
      expect(() => new Address({ ...validProps, country: 'A'.repeat(51) })).toThrow(
        ArgumentOutOfRangeException,
      );
    });
  });

  describe('validation — street', () => {
    it('accepts street at minimum length (2 chars)', () => {
      expect(() => new Address({ ...validProps, street: 'AB' })).not.toThrow();
    });

    it('accepts street at maximum length (50 chars)', () => {
      expect(() => new Address({ ...validProps, street: 'A'.repeat(50) })).not.toThrow();
    });

    it('rejects street shorter than 2 chars', () => {
      expect(() => new Address({ ...validProps, street: 'A' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });

    it('rejects street longer than 50 chars', () => {
      expect(() => new Address({ ...validProps, street: 'A'.repeat(51) })).toThrow(
        ArgumentOutOfRangeException,
      );
    });
  });

  describe('validation — postalCode', () => {
    it('accepts postalCode at minimum length (2 chars)', () => {
      expect(() => new Address({ ...validProps, postalCode: '12' })).not.toThrow();
    });

    it('accepts postalCode at maximum length (10 chars)', () => {
      expect(() => new Address({ ...validProps, postalCode: '1234567890' })).not.toThrow();
    });

    it('rejects postalCode shorter than 2 chars', () => {
      expect(() => new Address({ ...validProps, postalCode: '1' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });

    it('rejects postalCode longer than 10 chars', () => {
      expect(() => new Address({ ...validProps, postalCode: '12345678901' })).toThrow(
        ArgumentOutOfRangeException,
      );
    });
  });

  describe('equality', () => {
    it('two addresses with same props are equal', () => {
      const a = new Address(validProps);
      const b = new Address(validProps);
      expect(a.equals(b)).toBe(true);
    });

    it('two addresses with different props are not equal', () => {
      const a = new Address(validProps);
      const b = new Address({ ...validProps, country: 'France' });
      expect(a.equals(b)).toBe(false);
    });
  });
});
```

**Step 4: Write domain error tests**

Create `apps/api/src/modules/user/domain/user.errors.spec.ts`:

```typescript
import { UserAlreadyExistsError } from './user.errors';

describe('UserAlreadyExistsError', () => {
  it('has correct message', () => {
    const error = new UserAlreadyExistsError();
    expect(error.message).toBe('User already exists');
  });

  it('has correct code', () => {
    const error = new UserAlreadyExistsError();
    expect(error.code).toBe('USER.ALREADY_EXISTS');
  });

  it('preserves cause', () => {
    const cause = new Error('original');
    const error = new UserAlreadyExistsError(cause);
    expect(error.cause).toBe(cause);
  });

  it('preserves metadata', () => {
    const error = new UserAlreadyExistsError(undefined, { email: 'test@test.com' });
    expect(error.metadata).toEqual({ email: 'test@test.com' });
  });
});
```

Create `apps/api/src/modules/wallet/domain/wallet.errors.spec.ts`:

```typescript
import { WalletNotEnoughBalanceError } from './wallet.errors';

describe('WalletNotEnoughBalanceError', () => {
  it('has correct message', () => {
    const error = new WalletNotEnoughBalanceError();
    expect(error.message).toBe('Wallet has not enough balance');
  });

  it('has correct code', () => {
    const error = new WalletNotEnoughBalanceError();
    expect(error.code).toBe('WALLET.NOT_ENOUGH_BALANCE');
  });

  it('preserves metadata', () => {
    const error = new WalletNotEnoughBalanceError({ balance: 0, requested: 100 });
    expect(error.metadata).toEqual({ balance: 0, requested: 100 });
  });
});
```

**Step 5: Run the tests**

Run: `cd apps/api && pnpm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add apps/api/.jestrc.json apps/api/tests/setup/jest-unit-setup.ts apps/api/src/modules/user/domain/value-objects/address.value-object.spec.ts apps/api/src/modules/user/domain/user.errors.spec.ts apps/api/src/modules/wallet/domain/wallet.errors.spec.ts
git commit -m "test(domain): add Address value object and domain error tests"
```

---

### Task 11: Domain Tests — UserEntity

**Files:**
- Create: `apps/api/src/modules/user/domain/user.entity.spec.ts`

**Step 1: Write the tests**

```typescript
import { UserEntity } from './user.entity';
import { UserRoles } from './user.types';
import { Address } from './value-objects/address.value-object';
import { UserCreatedDomainEvent } from './events/user-created.domain-event';
import { UserDeletedDomainEvent } from './events/user-deleted.domain-event';
import { UserRoleChangedDomainEvent } from './events/user-role-changed.domain-event';
import { UserAddressUpdatedDomainEvent } from './events/user-address-updated.domain-event';

describe('UserEntity', () => {
  const validAddress = new Address({
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
  });

  describe('create', () => {
    it('creates a user with default guest role', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      expect(user.role).toBe(UserRoles.guest);
    });

    it('assigns a UUID id', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');
      expect(user.id.length).toBeGreaterThan(0);
    });

    it('stores email and address in props', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      const props = user.getProps();
      expect(props.email).toBe('test@example.com');
      expect(props.address.country).toBe('England');
    });

    it('emits UserCreatedDomainEvent', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserCreatedDomainEvent);

      const event = user.domainEvents[0] as UserCreatedDomainEvent;
      expect(event.aggregateId).toBe(user.id);
      expect(event.email).toBe('test@example.com');
      expect(event.country).toBe('England');
      expect(event.postalCode).toBe('28566');
      expect(event.street).toBe('Grand Avenue');
    });

    it('sets createdAt and updatedAt', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('role changes', () => {
    it('makeAdmin sets role to admin and emits event', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      user.clearEvents(); // clear creation event
      user.makeAdmin();

      expect(user.role).toBe(UserRoles.admin);
      expect(user.domainEvents).toHaveLength(1);

      const event = user.domainEvents[0] as UserRoleChangedDomainEvent;
      expect(event).toBeInstanceOf(UserRoleChangedDomainEvent);
      expect(event.oldRole).toBe(UserRoles.guest);
      expect(event.newRole).toBe(UserRoles.admin);
    });

    it('makeModerator sets role to moderator and emits event', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      user.clearEvents();
      user.makeModerator();

      expect(user.role).toBe(UserRoles.moderator);
      const event = user.domainEvents[0] as UserRoleChangedDomainEvent;
      expect(event.oldRole).toBe(UserRoles.guest);
      expect(event.newRole).toBe(UserRoles.moderator);
    });

    it('supports sequential role changes', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      user.clearEvents();
      user.makeModerator();
      user.makeAdmin();

      expect(user.role).toBe(UserRoles.admin);
      expect(user.domainEvents).toHaveLength(2);
    });
  });

  describe('delete', () => {
    it('emits UserDeletedDomainEvent', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      user.clearEvents();
      user.delete();

      expect(user.domainEvents).toHaveLength(1);
      expect(user.domainEvents[0]).toBeInstanceOf(UserDeletedDomainEvent);
      expect(user.domainEvents[0].aggregateId).toBe(user.id);
    });
  });

  describe('updateAddress', () => {
    it('updates address and emits UserAddressUpdatedDomainEvent', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      user.clearEvents();
      user.updateAddress({ country: 'France', street: 'Rue de Rivoli', postalCode: '75001' });

      const props = user.getProps();
      expect(props.address.country).toBe('France');
      expect(props.address.street).toBe('Rue de Rivoli');
      expect(props.address.postalCode).toBe('75001');

      expect(user.domainEvents).toHaveLength(1);
      const event = user.domainEvents[0] as UserAddressUpdatedDomainEvent;
      expect(event).toBeInstanceOf(UserAddressUpdatedDomainEvent);
      expect(event.country).toBe('France');
      expect(event.street).toBe('Rue de Rivoli');
      expect(event.postalCode).toBe('75001');
    });

    it('partial update merges with existing address', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      user.updateAddress({ country: 'France' });
      const props = user.getProps();
      expect(props.address.country).toBe('France');
      expect(props.address.street).toBe('Grand Avenue'); // unchanged
    });
  });

  describe('entity equality', () => {
    it('two users with same id are equal regardless of props', () => {
      const user1 = UserEntity.create({ email: 'a@test.com', address: validAddress });
      const user2Props = user1.getProps();
      const user2 = new (UserEntity as any)({
        id: user1.id,
        props: { email: 'b@test.com', role: UserRoles.admin, address: validAddress },
      });
      expect(user1.equals(user2)).toBe(true);
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/user/domain/user.entity.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add apps/api/src/modules/user/domain/user.entity.spec.ts
git commit -m "test(domain): add UserEntity tests"
```

---

### Task 12: Domain Tests — WalletEntity

**Files:**
- Create: `apps/api/src/modules/wallet/domain/wallet.entity.spec.ts`

**Step 1: Write the tests**

```typescript
import { ArgumentOutOfRangeException } from '@repo/core';
import { WalletEntity } from './wallet.entity';
import { WalletCreatedDomainEvent } from './events/wallet-created.domain-event';
import { WalletNotEnoughBalanceError } from './wallet.errors';

describe('WalletEntity', () => {
  describe('create', () => {
    it('creates a wallet with 0 balance', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      const props = wallet.getProps();
      expect(props.balance).toBe(0);
      expect(props.userId).toBe('user-1');
    });

    it('assigns a UUID id', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      expect(wallet.id).toBeDefined();
      expect(typeof wallet.id).toBe('string');
    });

    it('emits WalletCreatedDomainEvent', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      expect(wallet.domainEvents).toHaveLength(1);
      expect(wallet.domainEvents[0]).toBeInstanceOf(WalletCreatedDomainEvent);
      expect(wallet.domainEvents[0].aggregateId).toBe(wallet.id);
    });
  });

  describe('deposit', () => {
    it('increases balance', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(100);
      expect(wallet.getProps().balance).toBe(100);
    });

    it('accumulates multiple deposits', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(50);
      wallet.deposit(30);
      expect(wallet.getProps().balance).toBe(80);
    });

    it('accepts zero deposit', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(0);
      expect(wallet.getProps().balance).toBe(0);
    });
  });

  describe('withdraw', () => {
    it('returns ok and decreases balance when sufficient', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(100);
      const result = wallet.withdraw(40);
      expect(result.isOk()).toBe(true);
      expect(wallet.getProps().balance).toBe(60);
    });

    it('returns err when balance is insufficient', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(10);
      const result = wallet.withdraw(50);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(WalletNotEnoughBalanceError);
      }
    });

    it('allows withdrawing exact balance (reaching 0)', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(100);
      const result = wallet.withdraw(100);
      expect(result.isOk()).toBe(true);
      expect(wallet.getProps().balance).toBe(0);
    });

    it('does not modify balance on failed withdrawal', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      wallet.deposit(50);
      wallet.withdraw(100);
      expect(wallet.getProps().balance).toBe(50);
    });

    it('returns err for zero-balance withdrawal attempt', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      const result = wallet.withdraw(1);
      expect(result.isErr()).toBe(true);
    });
  });

  describe('validate', () => {
    it('throws if balance is negative (invariant protection)', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      // Force negative balance through internal manipulation for invariant test
      (wallet as any).props.balance = -1;
      expect(() => wallet.validate()).toThrow(ArgumentOutOfRangeException);
    });

    it('does not throw for zero balance', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      expect(() => wallet.validate()).not.toThrow();
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/wallet/domain/wallet.entity.spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add apps/api/src/modules/wallet/domain/wallet.entity.spec.ts
git commit -m "test(domain): add WalletEntity tests"
```

---

### Task 13: InMemoryRepository & FakeEventBus in `packages/testing`

**Files:**
- Create: `packages/testing/src/fakes/in-memory-repository.ts`
- Create: `packages/testing/src/fakes/fake-event-bus.ts`
- Create: `packages/testing/src/fakes/index.ts`
- Modify: `packages/testing/src/index.ts`

**Step 1: Write InMemoryRepository**

Create `packages/testing/src/fakes/in-memory-repository.ts`:

```typescript
import { Paginated, PaginatedQueryParams, RepositoryPort } from '@repo/core';

/**
 * In-memory implementation of RepositoryPort for testing command handlers
 * without a database. Stores entities in a Map keyed by ID.
 */
export class InMemoryRepository<Entity extends { id: string; domainEvents?: unknown[] }>
  implements RepositoryPort<Entity>
{
  private items = new Map<string, Entity>();

  async insert(entity: Entity | Entity[]): Promise<void> {
    const entities = Array.isArray(entity) ? entity : [entity];
    for (const e of entities) {
      this.items.set(e.id, e);
    }
  }

  async findOneById(id: string): Promise<Entity | undefined> {
    return this.items.get(id);
  }

  async findAll(): Promise<Entity[]> {
    return Array.from(this.items.values());
  }

  async findAllPaginated(params: PaginatedQueryParams): Promise<Paginated<Entity>> {
    const all = Array.from(this.items.values());
    const data = all.slice(params.offset, params.offset + params.limit);
    return new Paginated({
      data,
      count: all.length,
      limit: params.limit,
      page: params.page,
    });
  }

  async delete(entity: Entity): Promise<boolean> {
    return this.items.delete(entity.id);
  }

  async transaction<T>(handler: () => Promise<T>): Promise<T> {
    // In-memory: just execute the handler (no rollback support)
    return handler();
  }

  /** Test helper: clear all stored entities */
  clear(): void {
    this.items.clear();
  }

  /** Test helper: get count of stored entities */
  get count(): number {
    return this.items.size;
  }
}
```

**Step 2: Write FakeEventBus**

Create `packages/testing/src/fakes/fake-event-bus.ts`:

```typescript
/**
 * Fake event bus for testing. Captures all published events
 * for assertion without requiring EventEmitter2.
 */
export class FakeEventBus {
  private events: Array<{ name: string; payload: unknown }> = [];

  async emitAsync(name: string, payload: unknown): Promise<void> {
    this.events.push({ name, payload });
  }

  /** Get all emitted events */
  getEmittedEvents(): Array<{ name: string; payload: unknown }> {
    return [...this.events];
  }

  /** Get events of a specific type */
  getEventsOfType(name: string): unknown[] {
    return this.events.filter((e) => e.name === name).map((e) => e.payload);
  }

  /** Check if an event of a specific type was emitted */
  hasEmitted(name: string): boolean {
    return this.events.some((e) => e.name === name);
  }

  /** Clear all captured events */
  clear(): void {
    this.events = [];
  }
}
```

**Step 3: Create fakes index**

Create `packages/testing/src/fakes/index.ts`:

```typescript
export { InMemoryRepository } from './in-memory-repository';
export { FakeEventBus } from './fake-event-bus';
```

**Step 4: Update packages/testing/src/index.ts**

```typescript
// @repo/testing — shared test toolkit

// Matchers — import in setupFilesAfterEnv
export * from './matchers';

// Generic factories
export { createBaseEntityProps } from './factories';

// Fakes for unit testing
export { InMemoryRepository, FakeEventBus } from './fakes';
```

**Step 5: Commit**

```bash
git add packages/testing/src/fakes/ packages/testing/src/index.ts
git commit -m "feat(testing): add InMemoryRepository and FakeEventBus"
```

---

### Task 14: Application BDD Tests — CreateUserService

**Files:**
- Create: `apps/api/src/modules/user/commands/create-user/__tests__/create-user.feature`
- Create: `apps/api/src/modules/user/commands/create-user/__tests__/create-user.spec.ts`

**Step 1: Write the Gherkin feature file**

Create `apps/api/src/modules/user/commands/create-user/__tests__/create-user.feature`:

```gherkin
Feature: Create a user (command handler)

  Scenario: Successfully creating a new user
    Given no user with email "john@test.com" exists
    When I execute the create user command with email "john@test.com"
    Then the result is ok with an aggregate ID
    And a UserCreatedDomainEvent was published via the repository

  Scenario: Failing to create a user with a duplicate email
    Given a user with email "john@test.com" already exists
    When I execute the create user command with email "john@test.com"
    Then the result is an error of type UserAlreadyExistsError

  Scenario: Repository throws an unexpected error
    Given the repository will throw an unexpected error
    When I execute the create user command with email "john@test.com"
    Then the unexpected error is propagated
```

**Step 2: Write step definitions**

Create `apps/api/src/modules/user/commands/create-user/__tests__/create-user.spec.ts`:

```typescript
import { defineFeature, loadFeature } from 'jest-cucumber';
import { CreateUserService } from '../create-user.service';
import { CreateUserCommand } from '../create-user.command';
import { UserAlreadyExistsError } from '@modules/user/domain/user.errors';
import { ConflictException } from '@repo/core';
import { Result } from 'neverthrow';

const feature = loadFeature(
  'src/modules/user/commands/create-user/__tests__/create-user.feature',
);

defineFeature(feature, (test) => {
  let service: CreateUserService;
  let mockRepo: {
    insert: jest.Mock;
    findOneById: jest.Mock;
    findOneByEmail: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  let result: Result<string, UserAlreadyExistsError>;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
      findOneById: jest.fn(),
      findOneByEmail: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn((handler: () => Promise<any>) => handler()),
    };
    service = new CreateUserService(mockRepo as any);
  });

  test('Successfully creating a new user', ({ given, when, then, and }) => {
    given(/^no user with email "(.*)" exists$/, () => {
      // Default mock: insert succeeds
    });

    when(/^I execute the create user command with email "(.*)"$/, async (email: string) => {
      const command = new CreateUserCommand({
        email,
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      });
      result = await service.execute(command);
    });

    then('the result is ok with an aggregate ID', () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(typeof result.value).toBe('string');
        expect(result.value.length).toBeGreaterThan(0);
      }
    });

    and('a UserCreatedDomainEvent was published via the repository', () => {
      expect(mockRepo.transaction).toHaveBeenCalled();
      expect(mockRepo.insert).toHaveBeenCalled();
    });
  });

  test('Failing to create a user with a duplicate email', ({ given, when, then }) => {
    given(/^a user with email "(.*)" already exists$/, () => {
      mockRepo.insert.mockRejectedValue(
        new ConflictException('Record already exists'),
      );
    });

    when(/^I execute the create user command with email "(.*)"$/, async (email: string) => {
      const command = new CreateUserCommand({
        email,
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      });
      result = await service.execute(command);
    });

    then('the result is an error of type UserAlreadyExistsError', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(UserAlreadyExistsError);
      }
    });
  });

  test('Repository throws an unexpected error', ({ given, when, then }) => {
    let thrownError: Error | undefined;

    given('the repository will throw an unexpected error', () => {
      mockRepo.insert.mockRejectedValue(new Error('Connection lost'));
    });

    when(/^I execute the create user command with email "(.*)"$/, async (email: string) => {
      try {
        const command = new CreateUserCommand({
          email,
          country: 'England',
          postalCode: '28566',
          street: 'Grand Avenue',
        });
        await service.execute(command);
      } catch (e) {
        thrownError = e as Error;
      }
    });

    then('the unexpected error is propagated', () => {
      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('Connection lost');
    });
  });
});
```

**Step 3: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/user/commands/create-user/__tests__/create-user.spec.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/commands/create-user/__tests__/
git commit -m "test(app): add CreateUserService BDD tests"
```

---

### Task 15: Application BDD Tests — DeleteUserService

**Files:**
- Create: `apps/api/src/modules/user/commands/delete-user/__tests__/delete-user.feature`
- Create: `apps/api/src/modules/user/commands/delete-user/__tests__/delete-user.spec.ts`

**Step 1: Write the Gherkin feature file**

```gherkin
Feature: Delete a user (command handler)

  Scenario: Successfully deleting an existing user
    Given a user exists with ID "user-123"
    When I execute the delete user command for "user-123"
    Then the result is ok with true

  Scenario: Failing to delete a non-existent user
    Given no user exists with ID "user-999"
    When I execute the delete user command for "user-999"
    Then the result is an error of type NotFoundException

  Scenario: Repository throws an unexpected error during delete
    Given a user exists with ID "user-123"
    And the repository will throw during delete
    When I execute the delete user command for "user-123"
    Then the unexpected error is propagated
```

**Step 2: Write step definitions**

```typescript
import { defineFeature, loadFeature } from 'jest-cucumber';
import { DeleteUserCommand, DeleteUserService } from '../delete-user.service';
import { NotFoundException } from '@repo/core';
import { Result } from 'neverthrow';
import { createTestUser } from '@tests/factories';

const feature = loadFeature(
  'src/modules/user/commands/delete-user/__tests__/delete-user.feature',
);

defineFeature(feature, (test) => {
  let service: DeleteUserService;
  let mockRepo: {
    insert: jest.Mock;
    findOneById: jest.Mock;
    findAll: jest.Mock;
    findAllPaginated: jest.Mock;
    delete: jest.Mock;
    transaction: jest.Mock;
  };
  let result: Result<boolean, NotFoundException>;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn(),
      findOneById: jest.fn(),
      findAll: jest.fn(),
      findAllPaginated: jest.fn(),
      delete: jest.fn().mockResolvedValue(true),
      transaction: jest.fn(),
    };
    service = new DeleteUserService(mockRepo as any);
  });

  test('Successfully deleting an existing user', ({ given, when, then }) => {
    given(/^a user exists with ID "(.*)"$/, (id: string) => {
      const user = createTestUser();
      mockRepo.findOneById.mockResolvedValue(user);
    });

    when(/^I execute the delete user command for "(.*)"$/, async (userId: string) => {
      result = await service.execute(new DeleteUserCommand({ userId }));
    });

    then('the result is ok with true', () => {
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe(true);
      }
    });
  });

  test('Failing to delete a non-existent user', ({ given, when, then }) => {
    given(/^no user exists with ID "(.*)"$/, () => {
      mockRepo.findOneById.mockResolvedValue(undefined);
    });

    when(/^I execute the delete user command for "(.*)"$/, async (userId: string) => {
      result = await service.execute(new DeleteUserCommand({ userId }));
    });

    then('the result is an error of type NotFoundException', () => {
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  test('Repository throws an unexpected error during delete', ({ given, when, then, and }) => {
    let thrownError: Error | undefined;

    given(/^a user exists with ID "(.*)"$/, () => {
      const user = createTestUser();
      mockRepo.findOneById.mockResolvedValue(user);
    });

    and('the repository will throw during delete', () => {
      mockRepo.delete.mockRejectedValue(new Error('DB connection lost'));
    });

    when(/^I execute the delete user command for "(.*)"$/, async (userId: string) => {
      try {
        await service.execute(new DeleteUserCommand({ userId }));
      } catch (e) {
        thrownError = e as Error;
      }
    });

    then('the unexpected error is propagated', () => {
      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('DB connection lost');
    });
  });
});
```

**Step 3: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/user/commands/delete-user/__tests__/delete-user.spec.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/commands/delete-user/__tests__/
git commit -m "test(app): add DeleteUserService BDD tests"
```

---

### Task 16: Application BDD Tests — CreateWalletWhenUserIsCreated Event Handler

**Files:**
- Create: `apps/api/src/modules/wallet/application/event-handlers/__tests__/create-wallet-when-user-is-created.feature`
- Create: `apps/api/src/modules/wallet/application/event-handlers/__tests__/create-wallet-when-user-is-created.spec.ts`

**Step 1: Write the Gherkin feature file**

```gherkin
Feature: Create wallet when user is created (event handler)

  Scenario: Wallet is created after user registration
    Given a UserCreatedDomainEvent is received for user "user-123"
    When the event handler processes the event
    Then a wallet is created for user "user-123"

  Scenario: Repository failure during wallet creation
    Given a UserCreatedDomainEvent is received for user "user-456"
    And the wallet repository will throw an error
    When the event handler processes the event
    Then the error is propagated from the handler
```

**Step 2: Write step definitions**

```typescript
import { defineFeature, loadFeature } from 'jest-cucumber';
import { CreateWalletWhenUserIsCreatedDomainEventHandler } from '../create-wallet-when-user-is-created.domain-event-handler';
import { UserCreatedDomainEvent } from '@modules/user/domain/events/user-created.domain-event';

const feature = loadFeature(
  'src/modules/wallet/application/event-handlers/__tests__/create-wallet-when-user-is-created.feature',
);

defineFeature(feature, (test) => {
  let handler: CreateWalletWhenUserIsCreatedDomainEventHandler;
  let mockRepo: { insert: jest.Mock };
  let event: UserCreatedDomainEvent;

  beforeEach(() => {
    mockRepo = {
      insert: jest.fn().mockResolvedValue(undefined),
    };
    handler = new CreateWalletWhenUserIsCreatedDomainEventHandler(mockRepo as any);
  });

  test('Wallet is created after user registration', ({ given, when, then }) => {
    given(/^a UserCreatedDomainEvent is received for user "(.*)"$/, (userId: string) => {
      event = new UserCreatedDomainEvent({
        aggregateId: userId,
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      });
    });

    when('the event handler processes the event', async () => {
      await handler.handle(event);
    });

    then(/^a wallet is created for user "(.*)"$/, (userId: string) => {
      expect(mockRepo.insert).toHaveBeenCalledTimes(1);
      const insertedWallet = mockRepo.insert.mock.calls[0][0];
      expect(insertedWallet.getProps().userId).toBe(userId);
      expect(insertedWallet.getProps().balance).toBe(0);
    });
  });

  test('Repository failure during wallet creation', ({ given, when, then, and }) => {
    let thrownError: Error | undefined;

    given(/^a UserCreatedDomainEvent is received for user "(.*)"$/, (userId: string) => {
      event = new UserCreatedDomainEvent({
        aggregateId: userId,
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
      });
    });

    and('the wallet repository will throw an error', () => {
      mockRepo.insert.mockRejectedValue(new Error('DB unavailable'));
    });

    when('the event handler processes the event', async () => {
      try {
        await handler.handle(event);
      } catch (e) {
        thrownError = e as Error;
      }
    });

    then('the error is propagated from the handler', () => {
      expect(thrownError).toBeDefined();
      expect(thrownError!.message).toBe('DB unavailable');
    });
  });
});
```

**Step 3: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/wallet/application/event-handlers/__tests__/create-wallet-when-user-is-created.spec.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add apps/api/src/modules/wallet/application/event-handlers/__tests__/
git commit -m "test(app): add CreateWalletWhenUserIsCreated event handler BDD tests"
```

---

### Task 17: Mapper Unit Tests

**Files:**
- Create: `apps/api/src/modules/user/user.mapper.spec.ts`
- Create: `apps/api/src/modules/wallet/wallet.mapper.spec.ts`

**Step 1: Write UserMapper tests**

```typescript
import { UserMapper } from './user.mapper';
import { UserEntity } from './domain/user.entity';
import { Address } from './domain/value-objects/address.value-object';
import { UserRoles } from './domain/user.types';
import { UserModel } from './database/user.repository';

describe('UserMapper', () => {
  const mapper = new UserMapper();
  const validAddress = new Address({
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
  });

  describe('toPersistence', () => {
    it('converts entity to database model', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      const model = mapper.toPersistence(user);

      expect(model.id).toBe(user.id);
      expect(model.email).toBe('test@example.com');
      expect(model.country).toBe('England');
      expect(model.postalCode).toBe('28566');
      expect(model.street).toBe('Grand Avenue');
      expect(model.role).toBe(UserRoles.guest);
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomain', () => {
    it('reconstructs entity from database model', () => {
      const now = new Date();
      const model: UserModel = {
        id: 'user-123',
        createdAt: now,
        updatedAt: now,
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
        role: UserRoles.guest,
      };

      const entity = mapper.toDomain(model);
      const props = entity.getProps();

      expect(entity.id).toBe('user-123');
      expect(props.email).toBe('test@example.com');
      expect(props.role).toBe(UserRoles.guest);
      expect(props.address.country).toBe('England');
      expect(props.address.postalCode).toBe('28566');
      expect(props.address.street).toBe('Grand Avenue');
    });

    it('reconstructed entity has no pending domain events', () => {
      const now = new Date();
      const model: UserModel = {
        id: 'user-123',
        createdAt: now,
        updatedAt: now,
        email: 'test@example.com',
        country: 'England',
        postalCode: '28566',
        street: 'Grand Avenue',
        role: UserRoles.guest,
      };

      const entity = mapper.toDomain(model);
      expect(entity.domainEvents).toHaveLength(0);
    });
  });

  describe('toResponse', () => {
    it('converts entity to response DTO', () => {
      const user = UserEntity.create({ email: 'test@example.com', address: validAddress });
      const response = mapper.toResponse(user);

      expect(response.id).toBe(user.id);
      expect(response.email).toBe('test@example.com');
      expect(response.country).toBe('England');
      expect(response.postalCode).toBe('28566');
      expect(response.street).toBe('Grand Avenue');
    });
  });

  describe('round-trip', () => {
    it('entity → persistence → domain preserves all data', () => {
      const original = UserEntity.create({ email: 'test@example.com', address: validAddress });
      const model = mapper.toPersistence(original);
      const restored = mapper.toDomain(model);

      expect(restored.id).toBe(original.id);
      expect(restored.getProps().email).toBe(original.getProps().email);
      expect(restored.getProps().role).toBe(original.getProps().role);
      expect(restored.getProps().address.equals(original.getProps().address)).toBe(true);
    });
  });
});
```

**Step 2: Write WalletMapper tests**

```typescript
import { WalletMapper } from './wallet.mapper';
import { WalletEntity } from './domain/wallet.entity';
import { WalletModel } from './database/wallet.repository';

describe('WalletMapper', () => {
  const mapper = new WalletMapper();

  describe('toPersistence', () => {
    it('converts entity to database model', () => {
      const wallet = WalletEntity.create({ userId: 'user-1' });
      const model = mapper.toPersistence(wallet);

      expect(model.id).toBe(wallet.id);
      expect(model.userId).toBe('user-1');
      expect(model.balance).toBe(0);
      expect(model.createdAt).toBeInstanceOf(Date);
      expect(model.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('toDomain', () => {
    it('reconstructs entity from database model', () => {
      const now = new Date();
      const model: WalletModel = {
        id: 'wallet-123',
        createdAt: now,
        updatedAt: now,
        userId: 'user-1',
        balance: 500,
      };

      const entity = mapper.toDomain(model);
      const props = entity.getProps();

      expect(entity.id).toBe('wallet-123');
      expect(props.userId).toBe('user-1');
      expect(props.balance).toBe(500);
    });

    it('reconstructed entity has no pending domain events', () => {
      const now = new Date();
      const model: WalletModel = {
        id: 'wallet-123',
        createdAt: now,
        updatedAt: now,
        userId: 'user-1',
        balance: 0,
      };

      const entity = mapper.toDomain(model);
      expect(entity.domainEvents).toHaveLength(0);
    });
  });

  describe('toResponse', () => {
    it('throws not implemented', () => {
      expect(() => mapper.toResponse(undefined as any)).toThrow('Not implemented');
    });
  });

  describe('round-trip', () => {
    it('entity → persistence → domain preserves all data', () => {
      const original = WalletEntity.create({ userId: 'user-1' });
      const model = mapper.toPersistence(original);
      const restored = mapper.toDomain(model);

      expect(restored.id).toBe(original.id);
      expect(restored.getProps().userId).toBe(original.getProps().userId);
      expect(restored.getProps().balance).toBe(original.getProps().balance);
    });
  });
});
```

**Step 3: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/user/user.mapper.spec.ts src/modules/wallet/wallet.mapper.spec.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/user.mapper.spec.ts apps/api/src/modules/wallet/wallet.mapper.spec.ts
git commit -m "test(infra): add UserMapper and WalletMapper unit tests"
```

---

### Task 18: Zod Persistence Schema Tests

**Files:**
- Create: `apps/api/src/modules/user/database/user.schema.spec.ts`
- Create: `apps/api/src/modules/wallet/database/wallet.schema.spec.ts`

**Step 1: Write user schema tests**

```typescript
import { userSchema } from '../user.repository';

describe('userSchema (Zod)', () => {
  const validData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    email: 'test@example.com',
    country: 'England',
    postalCode: '28566',
    street: 'Grand Avenue',
    role: 'guest',
  };

  it('accepts valid user data', () => {
    const result = userSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts date strings and coerces to Date', () => {
    const result = userSchema.safeParse({
      ...validData,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date);
    }
  });

  it('rejects missing required fields', () => {
    const { email, ...incomplete } = validData;
    const result = userSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = userSchema.safeParse({ ...validData, email: 'not-an-email' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for id', () => {
    const result = userSchema.safeParse({ ...validData, id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid role', () => {
    const result = userSchema.safeParse({ ...validData, role: 'superadmin' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid roles', () => {
    for (const role of ['admin', 'moderator', 'guest']) {
      const result = userSchema.safeParse({ ...validData, role });
      expect(result.success).toBe(true);
    }
  });
});
```

**Step 2: Write wallet schema tests**

```typescript
import { walletSchema } from '../wallet.repository';

describe('walletSchema (Zod)', () => {
  const validData = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    userId: 'user-123',
    balance: 100,
  };

  it('accepts valid wallet data', () => {
    const result = walletSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('accepts zero balance', () => {
    const result = walletSchema.safeParse({ ...validData, balance: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative balance', () => {
    const result = walletSchema.safeParse({ ...validData, balance: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects balance exceeding max', () => {
    const result = walletSchema.safeParse({ ...validData, balance: 10000000 });
    expect(result.success).toBe(false);
  });

  it('rejects missing userId', () => {
    const { userId, ...incomplete } = validData;
    const result = walletSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('rejects empty userId', () => {
    const result = walletSchema.safeParse({ ...validData, userId: '' });
    expect(result.success).toBe(false);
  });
});
```

**Step 3: Run the tests**

Run: `cd apps/api && pnpm test -- src/modules/user/database/user.schema.spec.ts src/modules/wallet/database/wallet.schema.spec.ts`
Expected: All tests PASS

**Step 4: Commit**

```bash
git add apps/api/src/modules/user/database/user.schema.spec.ts apps/api/src/modules/wallet/database/wallet.schema.spec.ts
git commit -m "test(infra): add Zod persistence schema validation tests"
```

---

### Task 19: Integration Test Config & DB Helpers

**Files:**
- Create: `apps/api/jest-integration.json`
- Create: `apps/api/tests/setup/jest-integration-setup.ts`
- Create: `packages/testing/src/database/test-database-helper.ts`
- Create: `packages/testing/src/database/index.ts`
- Modify: `apps/api/package.json` (add test:integration script)
- Modify: `turbo.json` (add test:integration task)

**Step 1: Create jest-integration.json**

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "coverageDirectory": "./tests/coverage",
  "setupFilesAfterEnv": ["./tests/setup/jest-integration-setup.ts"],
  "globalSetup": "<rootDir>/tests/setup/jestGlobalSetup.ts",
  "testRegex": ".integration-spec.ts$",
  "moduleNameMapper": {
    "@src/(.*)$": "<rootDir>/src/$1",
    "@modules/(.*)$": "<rootDir>/src/modules/$1",
    "@config/(.*)$": "<rootDir>/src/configs/$1",
    "@tests/(.*)$": "<rootDir>/tests/$1",
    "@repo/core/src/(.*)$": "<rootDir>/../../packages/core/src/$1",
    "@repo/core": "<rootDir>/../../packages/core/src/index.ts"
  },
  "transformIgnorePatterns": [],
  "transform": {
    "^.+\\.(t|j)s$": ["ts-jest", {
      "tsconfig": {
        "allowJs": true,
        "esModuleInterop": true
      }
    }]
  }
}
```

**Step 2: Create integration test setup**

Create `apps/api/tests/setup/jest-integration-setup.ts`:

```typescript
import { createPool, DatabasePool, sql } from 'slonik';
import { postgresConnectionUri } from '@src/configs/database.config';

/**
 * Integration test setup — connects to test Postgres.
 * Does NOT bootstrap the NestJS application.
 * Provides database pool for repository integration tests.
 */

// Mock nestjs-request-context for code that uses RequestContextService
jest.mock('nestjs-request-context', () => ({
  RequestContext: {
    currentContext: {
      req: {
        requestId: 'test-request-id',
        transactionConnection: undefined,
      },
    },
  },
}));

let pool: DatabasePool;

beforeAll(async () => {
  pool = await createPool(postgresConnectionUri);
});

afterAll(async () => {
  await pool.end();
});

export function getIntegrationPool(): DatabasePool {
  return pool;
}

/**
 * Helper to truncate tables between tests.
 */
export async function truncateTables(
  pool: DatabasePool,
  tables: string[],
): Promise<void> {
  for (const table of tables) {
    await pool.query(sql.unsafe`TRUNCATE "${sql.identifier([table])}" CASCADE`);
  }
}
```

**Step 3: Create TestDatabaseHelper**

Create `packages/testing/src/database/test-database-helper.ts`:

```typescript
/**
 * Helper for managing test database state.
 * Use in integration tests that run against real Postgres.
 */
export class TestDatabaseHelper {
  constructor(private readonly pool: any) {}

  /**
   * Truncate specified tables. Call in afterEach for test isolation.
   */
  async truncate(...tableNames: string[]): Promise<void> {
    // Import sql dynamically to avoid requiring slonik in packages that don't need it
    const { sql } = await import('slonik');
    for (const table of tableNames) {
      await this.pool.query(sql.unsafe`TRUNCATE "${sql.identifier([table])}" CASCADE`);
    }
  }

  /**
   * Get the raw pool for direct SQL access.
   */
  getPool(): any {
    return this.pool;
  }
}
```

Create `packages/testing/src/database/index.ts`:

```typescript
export { TestDatabaseHelper } from './test-database-helper';
```

**Step 4: Add test:integration script to apps/api/package.json**

Add to `"scripts"`:
```json
"test:integration": "jest -i --config jest-integration.json"
```

**Step 5: Add test:integration task to turbo.json**

Add to `"tasks"`:
```json
"test:integration": {
  "dependsOn": ["build"]
}
```

**Step 6: Update packages/testing/src/index.ts**

```typescript
// @repo/testing — shared test toolkit

// Matchers — import in setupFilesAfterEnv
export * from './matchers';

// Generic factories
export { createBaseEntityProps } from './factories';

// Fakes for unit testing
export { InMemoryRepository, FakeEventBus } from './fakes';

// Database helpers for integration testing
export { TestDatabaseHelper } from './database';
```

**Step 7: Commit**

```bash
git add apps/api/jest-integration.json apps/api/tests/setup/jest-integration-setup.ts packages/testing/src/database/ packages/testing/src/index.ts apps/api/package.json turbo.json
git commit -m "feat(testing): add integration test config and database helpers"
```

---

### Task 20: Integration Tests — UserRepository

**Files:**
- Create: `apps/api/src/modules/user/database/user.repository.integration-spec.ts`

**Pre-requisite:** Docker test Postgres must be running: `cd apps/api && pnpm docker:test`

**Step 1: Write the tests**

```typescript
import { createPool, DatabasePool, sql } from 'slonik';
import { postgresConnectionUri } from '@src/configs/database.config';
import { UserRepository } from './user.repository';
import { UserMapper } from '../user.mapper';
import { UserEntity } from '../domain/user.entity';
import { Address } from '../domain/value-objects/address.value-object';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from '@nestjs/common';

describe('UserRepository (integration)', () => {
  let pool: DatabasePool;
  let repository: UserRepository;
  const mapper = new UserMapper();
  const eventEmitter = new EventEmitter2();

  beforeAll(async () => {
    pool = await createPool(postgresConnectionUri);
    // UserRepository needs pool injected; we construct it manually
    repository = new (UserRepository as any)(pool, mapper, eventEmitter);
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(sql.unsafe`TRUNCATE "users" CASCADE`);
    await pool.query(sql.unsafe`TRUNCATE "wallets" CASCADE`);
  });

  function createUser(email = 'test@example.com'): UserEntity {
    return UserEntity.create({
      email,
      address: new Address({ country: 'England', postalCode: '28566', street: 'Grand Avenue' }),
    });
  }

  describe('insert and findOneById', () => {
    it('round-trips a user entity', async () => {
      const user = createUser();
      await repository.insert(user);

      const found = await repository.findOneById(user.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(user.id);
      expect(found!.getProps().email).toBe('test@example.com');
      expect(found!.getProps().address.country).toBe('England');
    });

    it('returns undefined for non-existent id', async () => {
      const found = await repository.findOneById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('findOneByEmail', () => {
    it('finds a user by email', async () => {
      const user = createUser('findme@test.com');
      await repository.insert(user);

      const found = await repository.findOneByEmail('findme@test.com');
      expect(found).toBeDefined();
      expect(found.id).toBe(user.id);
    });
  });

  describe('findAllPaginated', () => {
    it('returns paginated results', async () => {
      // Insert 3 users
      for (let i = 0; i < 3; i++) {
        await repository.insert(createUser(`user${i}@test.com`));
      }

      const result = await repository.findAllPaginated({
        limit: 2,
        offset: 0,
        page: 0,
        orderBy: { field: true, param: 'desc' },
      });

      expect(result.data).toHaveLength(2);
      expect(result.limit).toBe(2);
    });
  });

  describe('delete', () => {
    it('removes a user', async () => {
      const user = createUser();
      await repository.insert(user);
      const deleted = await repository.delete(user);
      expect(deleted).toBe(true);

      const found = await repository.findOneById(user.id);
      expect(found).toBeUndefined();
    });
  });

  describe('transaction', () => {
    it('commits on success', async () => {
      const user = createUser();
      await repository.transaction(async () => {
        await repository.insert(user);
      });

      const found = await repository.findOneById(user.id);
      expect(found).toBeDefined();
    });

    it('rolls back on error', async () => {
      const user = createUser();
      try {
        await repository.transaction(async () => {
          await repository.insert(user);
          throw new Error('Force rollback');
        });
      } catch {
        // expected
      }

      const found = await repository.findOneById(user.id);
      expect(found).toBeUndefined();
    });
  });
});
```

**Step 2: Run the tests (requires Docker)**

Run: `cd apps/api && pnpm docker:test` (if not already running)
Run: `cd apps/api && pnpm test:integration -- src/modules/user/database/user.repository.integration-spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add apps/api/src/modules/user/database/user.repository.integration-spec.ts
git commit -m "test(infra): add UserRepository integration tests"
```

---

### Task 21: Integration Tests — WalletRepository

**Files:**
- Create: `apps/api/src/modules/wallet/database/wallet.repository.integration-spec.ts`

**Step 1: Write the tests**

```typescript
import { createPool, DatabasePool, sql } from 'slonik';
import { postgresConnectionUri } from '@src/configs/database.config';
import { WalletRepository } from './wallet.repository';
import { WalletMapper } from '../wallet.mapper';
import { WalletEntity } from '../domain/wallet.entity';
import { UserEntity } from '@modules/user/domain/user.entity';
import { UserMapper } from '@modules/user/user.mapper';
import { UserRepository } from '@modules/user/database/user.repository';
import { Address } from '@modules/user/domain/value-objects/address.value-object';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('WalletRepository (integration)', () => {
  let pool: DatabasePool;
  let walletRepository: WalletRepository;
  let userRepository: UserRepository;
  const eventEmitter = new EventEmitter2();

  beforeAll(async () => {
    pool = await createPool(postgresConnectionUri);
    walletRepository = new (WalletRepository as any)(pool, new WalletMapper(), eventEmitter);
    userRepository = new (UserRepository as any)(pool, new UserMapper(), eventEmitter);
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(sql.unsafe`TRUNCATE "wallets" CASCADE`);
    await pool.query(sql.unsafe`TRUNCATE "users" CASCADE`);
  });

  async function createUserAndWallet(): Promise<{ user: UserEntity; wallet: WalletEntity }> {
    const user = UserEntity.create({
      email: 'wallet-test@example.com',
      address: new Address({ country: 'England', postalCode: '28566', street: 'Grand Avenue' }),
    });
    await userRepository.insert(user);

    const wallet = WalletEntity.create({ userId: user.id });
    await walletRepository.insert(wallet);
    return { user, wallet };
  }

  describe('insert and findOneById', () => {
    it('round-trips a wallet entity', async () => {
      const { wallet } = await createUserAndWallet();

      const found = await walletRepository.findOneById(wallet.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(wallet.id);
      expect(found!.getProps().balance).toBe(0);
    });
  });

  describe('delete', () => {
    it('removes a wallet', async () => {
      const { wallet } = await createUserAndWallet();
      const deleted = await walletRepository.delete(wallet);
      expect(deleted).toBe(true);

      const found = await walletRepository.findOneById(wallet.id);
      expect(found).toBeUndefined();
    });
  });
});
```

**Step 2: Run the tests**

Run: `cd apps/api && pnpm test:integration -- src/modules/wallet/database/wallet.repository.integration-spec.ts`
Expected: All tests PASS

**Step 3: Commit**

```bash
git add apps/api/src/modules/wallet/database/wallet.repository.integration-spec.ts
git commit -m "test(infra): add WalletRepository integration tests"
```

---

### Task 22: Coverage Thresholds & CI Updates

**Files:**
- Modify: `packages/core/jest.config.json` (add coverage thresholds)
- Modify: `apps/api/.jestrc.json` (add coverage thresholds)
- Modify: `.github/workflows/ci.yml` (add integration test job, update coverage)

**Step 1: Add coverage thresholds to packages/core**

Update `packages/core/jest.config.json`, add:

```json
"coverageThreshold": {
  "global": {
    "branches": 90,
    "functions": 90,
    "lines": 90,
    "statements": 90
  }
}
```

**Step 2: Add coverage thresholds to apps/api**

Update `apps/api/.jestrc.json`, add:

```json
"coverageThreshold": {
  "global": {
    "branches": 60,
    "functions": 60,
    "lines": 60,
    "statements": 60
  }
}
```

**Step 3: Add test:integration CI job**

Add this job to `.github/workflows/ci.yml` after the `test-unit` job:

```yaml
  test-integration:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17-alpine
        ports:
          - 5433:5432
        env:
          POSTGRES_USER: user
          POSTGRES_PASSWORD: password
          POSTGRES_DB: ddh_tests
        options: >-
          --health-cmd "pg_isready -U user -d ddh_tests"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Run Flyway migrations
        run: >-
          docker run --rm --network host
          -v ${{ github.workspace }}/apps/api/database/migrations:/flyway/sql
          redgate/flyway:latest
          -url=jdbc:postgresql://localhost:5433/ddh_tests
          -user=user -password=password migrate
      - name: Run integration tests
        run: pnpm -F @repo/api test:integration
        env:
          DB_HOST: localhost
          DB_PORT: 5433
          DB_USERNAME: user
          DB_PASSWORD: password
          DB_NAME: ddh_tests
```

**Step 4: Update test-unit job to also run packages/core tests**

In the `test-unit` job, change the test command to run both core and api unit tests. The simplest way: `pnpm test` runs turbo which runs test in all workspaces.

Replace:
```yaml
- run: pnpm -F @repo/api test -- --coverage --passWithNoTests --testPathIgnorePatterns='e2e-spec'
```

With:
```yaml
- run: pnpm test -- --passWithNoTests
```

Or keep per-package for better CI output:
```yaml
- run: pnpm -F @repo/core test -- --coverage --passWithNoTests
- run: pnpm -F @repo/api test -- --coverage --passWithNoTests
```

**Step 5: Verify all tests pass**

Run: `cd packages/core && pnpm test`
Run: `cd apps/api && pnpm test`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add packages/core/jest.config.json apps/api/.jestrc.json .github/workflows/ci.yml
git commit -m "feat(ci): add coverage thresholds and integration test CI job"
```

---

### Task 23: Update NEXT_STEPS.md & Final Verification

**Files:**
- Modify: `NEXT_STEPS.md` (mark Phase 2 items as done)

**Step 1: Run all tests across the monorepo**

Run: `pnpm test`
Run: `cd apps/api && pnpm test:integration` (if Docker is running)
Run: `pnpm test:e2e` (if Docker is running)
Expected: All pass

**Step 2: Run coverage report**

Run: `cd packages/core && pnpm test -- --coverage`
Run: `cd apps/api && pnpm test -- --coverage`
Expected: Coverage meets thresholds (90% core, 60% global for api)

**Step 3: Update NEXT_STEPS.md**

Mark all Phase 2 items as `[x]`.

**Step 4: Commit**

```bash
git add NEXT_STEPS.md
git commit -m "docs: mark Phase 2 test coverage items as complete"
```
