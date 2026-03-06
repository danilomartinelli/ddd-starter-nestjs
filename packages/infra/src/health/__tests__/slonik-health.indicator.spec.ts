import { SlonikHealthIndicator } from "../slonik-health.indicator";
import { DatabasePool } from "slonik";

describe("SlonikHealthIndicator", () => {
  let indicator: SlonikHealthIndicator;
  let mockPool: Partial<DatabasePool>;

  beforeEach(() => {
    mockPool = {
      query: jest.fn(),
    };
    indicator = new SlonikHealthIndicator(mockPool as DatabasePool);
  });

  it("returns healthy status when DB responds", async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [{ "?column?": 1 }],
    });

    const result = await indicator.isHealthy("database");

    expect(result).toEqual({
      database: { status: "up" },
    });
  });

  it("returns unhealthy status when DB throws", async () => {
    (mockPool.query as jest.Mock).mockRejectedValue(
      new Error("Connection refused"),
    );

    const result = await indicator.isHealthy("database");

    expect(result).toEqual({
      database: { status: "down", message: "Connection refused" },
    });
  });
});
