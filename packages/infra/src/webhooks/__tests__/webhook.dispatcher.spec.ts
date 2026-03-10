import { WebhookDispatcher } from "../webhook.dispatcher";
import { WebhookRepository } from "../webhook.repository";
import { WebhookSigner } from "../webhook.signer";

describe("WebhookDispatcher", () => {
  let dispatcher: WebhookDispatcher;
  let mockRepo: jest.Mocked<
    Pick<
      WebhookRepository,
      "findActiveByEvent" | "insertDelivery" | "updateDelivery"
    >
  >;
  let signer: WebhookSigner;

  beforeEach(() => {
    mockRepo = {
      findActiveByEvent: jest.fn().mockResolvedValue([]),
      insertDelivery: jest.fn().mockResolvedValue(undefined),
      updateDelivery: jest.fn().mockResolvedValue(undefined),
    };
    signer = new WebhookSigner();
    dispatcher = new WebhookDispatcher(mockRepo as any, signer, {
      maxRetries: 3,
      retryDelayMs: 5000,
      timeoutMs: 10000,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("skips when no subscriptions found", async () => {
    mockRepo.findActiveByEvent.mockResolvedValue([]);

    await dispatcher.dispatch("user.created", { userId: "123" });

    expect(mockRepo.findActiveByEvent).toHaveBeenCalledWith("user.created");
    expect(mockRepo.insertDelivery).not.toHaveBeenCalled();
  });

  it("dispatches to active subscriptions", async () => {
    mockRepo.findActiveByEvent.mockResolvedValue([
      {
        id: "sub-1",
        url: "https://example.com/webhook",
        secret: "secret-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        events: ["user.created"],
        active: true,
        failureCount: 0,
        lastFailureAt: null,
      },
    ]);

    const mockResponse = {
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue("OK"),
    };
    jest.spyOn(global, "fetch").mockResolvedValue(mockResponse as any);

    await dispatcher.dispatch("user.created", { userId: "123" });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://example.com/webhook",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ userId: "123" }),
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-Webhook-Signature": expect.any(String),
          "X-Webhook-Event": "user.created",
        }),
      }),
    );
  });

  it("records successful delivery", async () => {
    mockRepo.findActiveByEvent.mockResolvedValue([
      {
        id: "sub-1",
        url: "https://example.com/webhook",
        secret: "secret-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        events: ["user.created"],
        active: true,
        failureCount: 0,
        lastFailureAt: null,
      },
    ]);

    jest.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue("OK"),
    } as any);

    await dispatcher.dispatch("user.created", { userId: "123" });

    expect(mockRepo.insertDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub-1",
        eventName: "user.created",
        status: "pending",
      }),
    );
    expect(mockRepo.updateDelivery).toHaveBeenCalledWith(
      expect.any(String),
      "success",
      200,
      "OK",
      1,
      null,
    );
  });

  it("records failed delivery", async () => {
    mockRepo.findActiveByEvent.mockResolvedValue([
      {
        id: "sub-1",
        url: "https://example.com/webhook",
        secret: "secret-1",
        createdAt: new Date(),
        updatedAt: new Date(),
        events: ["user.created"],
        active: true,
        failureCount: 0,
        lastFailureAt: null,
      },
    ]);

    jest.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

    await dispatcher.dispatch("user.created", { userId: "123" });

    expect(mockRepo.updateDelivery).toHaveBeenCalledWith(
      expect.any(String),
      "failed",
      null,
      "Network error",
      1,
      expect.any(Date),
    );
  });
});
