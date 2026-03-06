import { DynamicModule, Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { SlonikHealthIndicator } from "./slonik-health.indicator";
import { DatabasePool } from "slonik";

@Module({})
export class HealthModule {
  /**
   * Import with a database pool reference so the health indicator can ping the DB.
   * Usage: HealthModule.forRoot(SLONIK_POOL) — pass the injection token for the Slonik pool.
   */
  static forRoot(poolToken: symbol): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        {
          provide: SlonikHealthIndicator,
          useFactory: (pool: DatabasePool) => new SlonikHealthIndicator(pool),
          inject: [poolToken],
        },
      ],
    };
  }
}
