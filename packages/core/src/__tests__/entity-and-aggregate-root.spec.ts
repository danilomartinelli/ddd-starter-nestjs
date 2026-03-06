import { AggregateRoot } from "../ddd/aggregate-root.base";
import { Entity } from "../ddd/entity.base";
import { DomainEvent, DomainEventProps } from "../ddd/domain-event.base";
import {
  ArgumentNotProvidedException,
  ArgumentInvalidException,
  ArgumentOutOfRangeException,
} from "../exceptions";

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
    this.addEvent(new TestDomainEvent({ aggregateId: this.id, name }));
  }
}

// Concrete entity for Entity base tests
class TestEntity extends AggregateRoot<TestEntityProps> {
  protected readonly _id: string;
  validate(): void {}
}

describe("Entity", () => {
  const validProps = { name: "test", value: 42 };

  describe("construction", () => {
    it("assigns the provided id", () => {
      const entity = new TestEntity({ id: "entity-1", props: validProps });
      expect(entity.id).toBe("entity-1");
    });

    it("sets createdAt and updatedAt to now when not provided", () => {
      const before = new Date();
      const entity = new TestEntity({ id: "entity-1", props: validProps });
      const after = new Date();

      expect(entity.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
      expect(entity.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(entity.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it("uses provided createdAt and updatedAt", () => {
      const createdAt = new Date("2024-01-01");
      const updatedAt = new Date("2024-06-01");
      const entity = new TestEntity({
        id: "entity-1",
        props: validProps,
        createdAt,
        updatedAt,
      });
      expect(entity.createdAt).toBe(createdAt);
      expect(entity.updatedAt).toBe(updatedAt);
    });

    it("calls validate() on construction", () => {
      const validateSpy = jest.spyOn(TestEntity.prototype, "validate");
      new TestEntity({ id: "entity-1", props: validProps });
      expect(validateSpy).toHaveBeenCalled();
      validateSpy.mockRestore();
    });

    it("throws when props are empty", () => {
      expect(
        () => new TestEntity({ id: "entity-1", props: null as any }),
      ).toThrow(ArgumentNotProvidedException);
    });

    it("throws when props is not an object", () => {
      expect(
        () => new TestEntity({ id: "entity-1", props: "string" as any }),
      ).toThrow(ArgumentInvalidException);
    });

    it("throws when props has more than 50 properties", () => {
      const bigProps: any = {};
      for (let i = 0; i < 51; i++) {
        bigProps[`prop${i}`] = i;
      }
      expect(() => new TestEntity({ id: "entity-1", props: bigProps })).toThrow(
        ArgumentOutOfRangeException,
      );
    });
  });

  describe("equality", () => {
    it("two entities with same ID are equal", () => {
      const a = new TestEntity({
        id: "same-id",
        props: { name: "A", value: 1 },
      });
      const b = new TestEntity({
        id: "same-id",
        props: { name: "B", value: 2 },
      });
      expect(a.equals(b)).toBe(true);
    });

    it("two entities with different IDs are not equal", () => {
      const a = new TestEntity({ id: "id-1", props: validProps });
      const b = new TestEntity({ id: "id-2", props: validProps });
      expect(a.equals(b)).toBe(false);
    });

    it("returns false for null", () => {
      const a = new TestEntity({ id: "id-1", props: validProps });
      expect(a.equals(null as any)).toBe(false);
    });

    it("returns false for undefined", () => {
      const a = new TestEntity({ id: "id-1", props: validProps });
      expect(a.equals(undefined as any)).toBe(false);
    });

    it("returns true for same reference", () => {
      const a = new TestEntity({ id: "id-1", props: validProps });
      expect(a.equals(a)).toBe(true);
    });
  });

  describe("getProps", () => {
    it("returns id, createdAt, updatedAt, and entity props", () => {
      const entity = new TestEntity({ id: "entity-1", props: validProps });
      const result = entity.getProps();

      expect(result.id).toBe("entity-1");
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.name).toBe("test");
      expect(result.value).toBe(42);
    });

    it("returns a frozen object", () => {
      const entity = new TestEntity({ id: "entity-1", props: validProps });
      const props = entity.getProps();
      expect(Object.isFrozen(props)).toBe(true);
    });
  });

  describe("isEntity", () => {
    it("returns true for Entity instances", () => {
      const entity = new TestEntity({ id: "entity-1", props: validProps });
      expect(Entity.isEntity(entity)).toBe(true);
    });

    it("returns false for plain objects", () => {
      expect(Entity.isEntity({ id: "1" })).toBe(false);
    });
  });
});

describe("AggregateRoot", () => {
  const validProps = { name: "test", value: 42 };

  describe("domain events", () => {
    it("starts with empty domain events", () => {
      const aggregate = new TestAggregate({ id: "agg-1", props: validProps });
      expect(aggregate.domainEvents).toEqual([]);
    });

    it("addEvent stores domain events", () => {
      const aggregate = new TestAggregate({ id: "agg-1", props: validProps });
      aggregate.emitTestEvent("something happened");
      expect(aggregate.domainEvents).toHaveLength(1);
      expect(aggregate.domainEvents[0]).toBeInstanceOf(TestDomainEvent);
    });

    it("accumulates multiple events", () => {
      const aggregate = new TestAggregate({ id: "agg-1", props: validProps });
      aggregate.emitTestEvent("first");
      aggregate.emitTestEvent("second");
      expect(aggregate.domainEvents).toHaveLength(2);
    });

    it("clearEvents removes all events", () => {
      const aggregate = new TestAggregate({ id: "agg-1", props: validProps });
      aggregate.emitTestEvent("event");
      aggregate.clearEvents();
      expect(aggregate.domainEvents).toEqual([]);
    });

    it("publishEvents publishes and clears events", async () => {
      const aggregate = new TestAggregate({ id: "agg-1", props: validProps });
      aggregate.emitTestEvent("event");

      const mockLogger = {
        debug: jest.fn(),
        log: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
      };
      const mockEmitter = { emitAsync: jest.fn().mockResolvedValue([]) } as any;

      await aggregate.publishEvents(mockLogger, mockEmitter);

      expect(mockEmitter.emitAsync).toHaveBeenCalledWith(
        "TestDomainEvent",
        expect.any(TestDomainEvent),
      );
      expect(aggregate.domainEvents).toEqual([]);
    });
  });
});
