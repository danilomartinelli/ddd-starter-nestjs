import { DatabasePool, sql } from "slonik";

/**
 * Helper for managing test database state.
 * Use in integration tests that run against real Postgres.
 */
export class TestDatabaseHelper {
  constructor(private readonly pool: DatabasePool) {}

  /**
   * Truncate specified tables. Call in afterEach for test isolation.
   */
  async truncate(...tableNames: string[]): Promise<void> {
    for (const table of tableNames) {
      await this.pool.query(
        sql.unsafe`TRUNCATE TABLE ${sql.identifier([table])} CASCADE`,
      );
    }
  }

  /**
   * Get the raw pool for direct SQL access.
   */
  getPool(): DatabasePool {
    return this.pool;
  }
}
