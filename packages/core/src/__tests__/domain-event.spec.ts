import { DomainEvent, DomainEventProps } from "../ddd/domain-event.base";
import { ArgumentNotProvidedException } from "../exceptions";

class TestEvent extends DomainEvent {
  readonly payload: string;
  constructor(props: DomainEventProps<TestEvent>) {
    super(props);
    this.payload = props.payload;
  }
}

describe("DomainEvent", () => {
  it("generates a unique id", () => {
    const event = new TestEvent({ aggregateId: "agg-1", payload: "test" });
    expect(event.id).toBeDefined();
    expect(typeof event.id).toBe("string");
    expect(event.id.length).toBeGreaterThan(0);
  });

  it("stores the aggregateId", () => {
    const event = new TestEvent({ aggregateId: "agg-1", payload: "test" });
    expect(event.aggregateId).toBe("agg-1");
  });

  it("sets metadata with default timestamp", () => {
    const before = Date.now();
    const event = new TestEvent({ aggregateId: "agg-1", payload: "test" });
    expect(event.metadata.timestamp).toBeGreaterThanOrEqual(before);
    expect(event.metadata.correlationId).toBe("test-request-id");
  });

  it("accepts custom metadata", () => {
    const event = new TestEvent({
      aggregateId: "agg-1",
      payload: "test",
      metadata: {
        correlationId: "custom-corr",
        causationId: "custom-cause",
        timestamp: 1234567890,
        userId: "user-1",
      },
    });
    expect(event.metadata.correlationId).toBe("custom-corr");
    expect(event.metadata.causationId).toBe("custom-cause");
    expect(event.metadata.timestamp).toBe(1234567890);
    expect(event.metadata.userId).toBe("user-1");
  });

  it("preserves custom properties", () => {
    const event = new TestEvent({ aggregateId: "agg-1", payload: "my-data" });
    expect(event.payload).toBe("my-data");
  });

  it("generates unique IDs for each event", () => {
    const a = new TestEvent({ aggregateId: "agg-1", payload: "a" });
    const b = new TestEvent({ aggregateId: "agg-1", payload: "b" });
    expect(a.id).not.toBe(b.id);
  });

  it("throws for empty props", () => {
    expect(() => new TestEvent(null as any)).toThrow(
      ArgumentNotProvidedException,
    );
  });
});
