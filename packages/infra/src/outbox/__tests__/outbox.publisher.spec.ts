import { OutboxPublisher } from "../outbox.publisher";
import { OutboxRepository } from "../outbox.repository";
import { OutboxModel } from "../outbox.schema";

function createMockRepository(): jest.Mocked<
  Pick<OutboxRepository, "findUnpublished" | "markPublished">
> {
  return {
    findUnpublished: jest.fn().mockResolvedValue([]),
    markPublished: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockEventEmitter(): { emitAsync: jest.Mock } {
  return {
    emitAsync: jest.fn().mockResolvedValue([]),
  };
}

function createOutboxEvent(overrides: Partial<OutboxModel> = {}): OutboxModel {
  return {
    id: "outbox-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    eventName: "UserCreatedDomainEvent",
    payload: { aggregateId: "user-1", email: "test@example.com" },
    publishedAt: null,
    ...overrides,
  };
}

describe("OutboxPublisher", () => {
  describe("publishPendingEvents", () => {
    it("does nothing when no unpublished events exist", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();
      const publisher = new OutboxPublisher(repo as any, emitter as any);

      await publisher.publishPendingEvents();

      expect(repo.findUnpublished).toHaveBeenCalledTimes(1);
      expect(emitter.emitAsync).not.toHaveBeenCalled();
      expect(repo.markPublished).not.toHaveBeenCalled();
    });

    it("publishes events and marks them as published", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();
      const event1 = createOutboxEvent({ id: "evt-1", eventName: "Event1" });
      const event2 = createOutboxEvent({ id: "evt-2", eventName: "Event2" });
      repo.findUnpublished.mockResolvedValue([event1, event2]);

      const publisher = new OutboxPublisher(repo as any, emitter as any);
      await publisher.publishPendingEvents();

      expect(emitter.emitAsync).toHaveBeenCalledTimes(2);
      expect(emitter.emitAsync).toHaveBeenCalledWith("Event1", event1.payload);
      expect(emitter.emitAsync).toHaveBeenCalledWith("Event2", event2.payload);
      expect(repo.markPublished).toHaveBeenCalledWith(["evt-1", "evt-2"]);
    });

    it("only marks successfully published events", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();

      const successEvent = createOutboxEvent({
        id: "evt-success",
        eventName: "SuccessEvent",
      });
      const failEvent = createOutboxEvent({
        id: "evt-fail",
        eventName: "FailEvent",
      });
      repo.findUnpublished.mockResolvedValue([successEvent, failEvent]);

      emitter.emitAsync
        .mockResolvedValueOnce([])
        .mockRejectedValueOnce(new Error("publish failed"));

      const publisher = new OutboxPublisher(repo as any, emitter as any);
      await publisher.publishPendingEvents();

      expect(repo.markPublished).toHaveBeenCalledWith(["evt-success"]);
    });

    it("does not call markPublished when all events fail", async () => {
      const repo = createMockRepository();
      const emitter = createMockEventEmitter();

      const failEvent = createOutboxEvent({
        id: "evt-fail",
        eventName: "FailEvent",
      });
      repo.findUnpublished.mockResolvedValue([failEvent]);

      emitter.emitAsync.mockRejectedValue(new Error("publish failed"));

      const publisher = new OutboxPublisher(repo as any, emitter as any);
      await publisher.publishPendingEvents();

      expect(repo.markPublished).not.toHaveBeenCalled();
    });
  });
});
