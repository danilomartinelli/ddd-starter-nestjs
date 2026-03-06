import { Test } from "@nestjs/testing";
import { HealthController } from "../health.controller";
import { TerminusModule } from "@nestjs/terminus";
import { SlonikHealthIndicator } from "../slonik-health.indicator";

describe("HealthController", () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: SlonikHealthIndicator,
          useValue: {
            isHealthy: jest.fn().mockResolvedValue({
              database: { status: "up" },
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
  });

  it("returns health check result", async () => {
    const result = await controller.check();
    expect(result.status).toBe("ok");
    expect(result.info).toHaveProperty("database");
  });
});
