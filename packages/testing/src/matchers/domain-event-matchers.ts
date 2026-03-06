import { AggregateRoot, DomainEvent } from "@repo/core";

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
          : `Expected aggregate to have ${eventClass.name} event, but found: [${events.map((e) => e.constructor.name).join(", ")}]`,
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
