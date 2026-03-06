import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult } from "@nestjs/terminus";
import { DatabasePool, sql } from "slonik";

@Injectable()
export class SlonikHealthIndicator extends HealthIndicator {
  constructor(private readonly pool: DatabasePool) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.pool.query(sql.unsafe`SELECT 1`);
      return this.getStatus(key, true);
    } catch (error: any) {
      return this.getStatus(key, false, { message: error.message });
    }
  }
}
