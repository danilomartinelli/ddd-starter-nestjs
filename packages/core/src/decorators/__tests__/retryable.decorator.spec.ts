import { Retryable } from "../retryable.decorator";
import { ExceptionBase } from "../../exceptions";

class TestBusinessError extends ExceptionBase {
  static readonly message = "Business error";
  public readonly code = "TEST.BUSINESS_ERROR";
  constructor() {
    super(TestBusinessError.message);
  }
}

describe("Retryable decorator", () => {
  it("retries the specified number of times on transient errors", async () => {
    let callCount = 0;

    class TestService {
      @Retryable({ maxRetries: 3, baseDelayMs: 10 })
      async flaky(): Promise<string> {
        callCount++;
        if (callCount < 3) throw new Error("transient");
        return "success";
      }
    }

    const service = new TestService();
    const result = await service.flaky();
    expect(result).toBe("success");
    expect(callCount).toBe(3);
  });

  it("throws after all retries are exhausted", async () => {
    class TestService {
      @Retryable({ maxRetries: 2, baseDelayMs: 10 })
      async alwaysFails(): Promise<string> {
        throw new Error("always fails");
      }
    }

    const service = new TestService();
    await expect(service.alwaysFails()).rejects.toThrow("always fails");
  });

  it("does NOT retry business errors (ExceptionBase)", async () => {
    let callCount = 0;

    class TestService {
      @Retryable({ maxRetries: 3, baseDelayMs: 10 })
      async businessFail(): Promise<string> {
        callCount++;
        throw new TestBusinessError();
      }
    }

    const service = new TestService();
    await expect(service.businessFail()).rejects.toThrow(TestBusinessError);
    expect(callCount).toBe(1); // No retries for business errors
  });

  it("succeeds on first attempt without delay", async () => {
    let callCount = 0;

    class TestService {
      @Retryable({ maxRetries: 3, baseDelayMs: 10 })
      async works(): Promise<string> {
        callCount++;
        return "ok";
      }
    }

    const service = new TestService();
    const result = await service.works();
    expect(result).toBe("ok");
    expect(callCount).toBe(1);
  });

  it("uses exponential backoff between retries", async () => {
    const delays: number[] = [];
    // Mock setTimeout to capture delay values
    jest
      .spyOn(global, "setTimeout")
      .mockImplementation((fn: any, delay?: number) => {
        delays.push(delay || 0);
        fn();
        return 0 as any;
      });

    class TestService {
      @Retryable({ maxRetries: 3, baseDelayMs: 100, jitter: false })
      async alwaysFails(): Promise<string> {
        throw new Error("transient");
      }
    }

    const service = new TestService();
    await expect(service.alwaysFails()).rejects.toThrow("transient");

    // Delays should be exponential: 100, 200, 400
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBe(100);
    expect(delays[1]).toBe(200);
    expect(delays[2]).toBe(400);

    jest.restoreAllMocks();
  });
});
