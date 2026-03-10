import { Test } from "@nestjs/testing";
import { QueueModule } from "../queue.module";
import { QUEUE_PORT } from "../queue.port";
import { BullMqAdapter } from "../bullmq.adapter";

// Mock ioredis to avoid real connections in unit tests
jest.mock("ioredis", () => {
  return jest.fn().mockImplementation(() => ({
    quit: jest.fn().mockResolvedValue("OK"),
    status: "ready",
  }));
});

// Mock bullmq Queue to avoid real Redis connections
jest.mock("bullmq", () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn().mockResolvedValue({ id: "test-job-id" }),
    close: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe("QueueModule", () => {
  it("should create the module and provide QUEUE_PORT", async () => {
    const module = await Test.createTestingModule({
      imports: [
        QueueModule.forRoot({
          redisHost: "localhost",
          redisPort: 6379,
        }),
      ],
    }).compile();

    const queuePort = module.get(QUEUE_PORT);
    expect(queuePort).toBeDefined();
    expect(queuePort).toBeInstanceOf(BullMqAdapter);

    await module.close();
  });

  it("should enqueue a job and return job id", async () => {
    const module = await Test.createTestingModule({
      imports: [
        QueueModule.forRoot({
          redisHost: "localhost",
          redisPort: 6379,
        }),
      ],
    }).compile();

    const queuePort = module.get<BullMqAdapter>(QUEUE_PORT);
    const jobId = await queuePort.enqueue("test-queue", "test-job", {
      foo: "bar",
    });

    expect(jobId).toBe("test-job-id");

    await module.close();
  });

  it("should schedule a job with delay", async () => {
    const module = await Test.createTestingModule({
      imports: [
        QueueModule.forRoot({
          redisHost: "localhost",
          redisPort: 6379,
        }),
      ],
    }).compile();

    const queuePort = module.get<BullMqAdapter>(QUEUE_PORT);
    const jobId = await queuePort.schedule(
      "test-queue",
      "delayed-job",
      { foo: "bar" },
      5000,
    );

    expect(jobId).toBe("test-job-id");

    await module.close();
  });
});
