import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async insert(record: {
    id: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    changes?: unknown;
    metadata?: unknown;
  }): Promise<void> {
    try {
      await this.pool.query(
        sql.unsafe`
          INSERT INTO "audit_logs" ("id", "userId", "action", "entityType", "entityId", "changes", "metadata")
          VALUES (
            ${record.id},
            ${record.userId},
            ${record.action},
            ${record.entityType},
            ${record.entityId},
            ${record.changes ? sql.jsonb(record.changes as any) : null},
            ${record.metadata ? sql.jsonb(record.metadata as any) : null}
          )
        `,
      );
    } catch (error) {
      this.logger.error("Failed to write audit log", error);
    }
  }
}
