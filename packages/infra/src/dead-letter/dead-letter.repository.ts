import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { failedEventSchema, FailedEventModel } from "./dead-letter.schema";

@Injectable()
export class DeadLetterRepository {
  private readonly logger = new Logger(DeadLetterRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async insert(
    record: Omit<FailedEventModel, "createdAt" | "updatedAt">,
  ): Promise<void> {
    // Write-only: no return validation needed
    await this.pool.query(
      sql.unsafe`
        INSERT INTO "failed_events" (
          "id", "eventName", "payload", "error",
          "attempts", "maxAttempts", "nextRetryAt", "status"
        )
        VALUES (
          ${record.id},
          ${record.eventName},
          ${sql.jsonb(record.payload as any)},
          ${record.error},
          ${record.attempts},
          ${record.maxAttempts},
          ${record.nextRetryAt?.toISOString() ?? null},
          ${record.status}
        )
      `,
    );
  }

  async findPendingRetries(): Promise<FailedEventModel[]> {
    const result = await this.pool.query(
      sql.type(failedEventSchema)`
        SELECT *
        FROM "failed_events"
        WHERE "status" = 'pending_retry'
          AND "nextRetryAt" <= NOW()
        ORDER BY "nextRetryAt" ASC
      `,
    );

    return [...result.rows];
  }

  async updateStatus(
    id: string,
    status: string,
    attempts: number,
    nextRetryAt: Date | null,
  ): Promise<void> {
    // Write-only: no return validation needed
    await this.pool.query(
      sql.unsafe`
        UPDATE "failed_events"
        SET
          "status" = ${status},
          "attempts" = ${attempts},
          "nextRetryAt" = ${nextRetryAt?.toISOString() ?? null},
          "updatedAt" = NOW()
        WHERE "id" = ${id}
      `,
    );
  }

  async markResolved(id: string): Promise<void> {
    // Write-only: no return validation needed
    await this.pool.query(
      sql.unsafe`
        UPDATE "failed_events"
        SET
          "status" = 'resolved',
          "nextRetryAt" = NULL,
          "updatedAt" = NOW()
        WHERE "id" = ${id}
      `,
    );
  }
}
