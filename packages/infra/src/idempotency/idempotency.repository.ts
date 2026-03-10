import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import {
  idempotencyKeySchema,
  IdempotencyKeyModel,
} from "./idempotency.schema";

@Injectable()
export class IdempotencyRepository {
  private readonly logger = new Logger(IdempotencyRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async findByKey(key: string): Promise<IdempotencyKeyModel | null> {
    const result = await this.pool.query(
      sql.type(idempotencyKeySchema)`
        SELECT key, "responseStatus", "responseBody", "createdAt", "expiresAt"
        FROM "idempotency_keys"
        WHERE key = ${key}
          AND "expiresAt" > NOW()
      `,
    );

    if (result.rowCount === 0) {
      return null;
    }

    return result.rows[0];
  }

  async save(record: IdempotencyKeyModel): Promise<void> {
    const responseBody =
      record.responseBody !== null && record.responseBody !== undefined
        ? sql.jsonb(record.responseBody as any)
        : null;

    // Write-only: no return validation needed
    await this.pool.query(
      sql.unsafe`
        INSERT INTO "idempotency_keys" (key, "responseStatus", "responseBody", "createdAt", "expiresAt")
        VALUES (
          ${record.key},
          ${record.responseStatus},
          ${responseBody},
          ${record.createdAt.toISOString()},
          ${record.expiresAt.toISOString()}
        )
        ON CONFLICT (key) DO UPDATE SET
          "responseStatus" = EXCLUDED."responseStatus",
          "responseBody" = EXCLUDED."responseBody",
          "expiresAt" = EXCLUDED."expiresAt"
      `,
    );
  }

  async deleteExpired(): Promise<void> {
    // Write-only: no return validation needed
    const result = await this.pool.query(
      sql.unsafe`
        DELETE FROM "idempotency_keys"
        WHERE "expiresAt" <= NOW()
      `,
    );

    if (result.rowCount > 0) {
      this.logger.log(`Cleaned up ${result.rowCount} expired idempotency keys`);
    }
  }
}
