import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import { outboxSchema, OutboxModel } from "./outbox.schema";

@Injectable()
export class OutboxRepository {
  private readonly logger = new Logger(OutboxRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async insertEvent(
    id: string,
    eventName: string,
    payload: unknown,
  ): Promise<void> {
    await this.pool.query(
      sql.unsafe`
        INSERT INTO "outbox" ("id", "eventName", "payload")
        VALUES (${id}, ${eventName}, ${sql.jsonb(payload as any)})
      `,
    );
  }

  async findUnpublished(limit = 100): Promise<OutboxModel[]> {
    const result = await this.pool.query(
      sql.type(outboxSchema)`
        SELECT "id", "createdAt", "eventName", "payload", "publishedAt"
        FROM "outbox"
        WHERE "publishedAt" IS NULL
        ORDER BY "createdAt" ASC
        LIMIT ${limit}
      `,
    );

    return [...result.rows];
  }

  async markPublished(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    await this.pool.query(
      sql.unsafe`
        UPDATE "outbox"
        SET "publishedAt" = NOW()
        WHERE "id" = ANY(${sql.array(ids, "text")})
      `,
    );

    this.logger.log(`Marked ${ids.length} outbox events as published`);
  }
}
