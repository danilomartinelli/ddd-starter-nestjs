import { Injectable, Logger } from "@nestjs/common";
import { InjectPool } from "@danilomartinelli/nestjs-slonik";
import { DatabasePool, sql } from "slonik";
import {
  webhookSubscriptionSchema,
  WebhookSubscriptionModel,
  webhookDeliverySchema,
} from "./webhook.schema";

@Injectable()
export class WebhookRepository {
  private readonly logger = new Logger(WebhookRepository.name);

  constructor(@InjectPool() private readonly pool: DatabasePool) {}

  async findActiveByEvent(
    eventName: string,
  ): Promise<WebhookSubscriptionModel[]> {
    const result = await this.pool.query(
      sql.type(webhookSubscriptionSchema)`
        SELECT * FROM "webhook_subscriptions"
        WHERE "active" = true AND ${eventName} = ANY("events")
      `,
    );
    return [...result.rows];
  }

  async insertDelivery(delivery: {
    id: string;
    subscriptionId: string;
    eventName: string;
    payload: unknown;
    status: string;
    responseStatus: number | null;
    responseBody: string | null;
    attempts: number;
    nextRetryAt: Date | null;
  }): Promise<void> {
    await this.pool.query(
      sql.type(webhookDeliverySchema)`
        INSERT INTO "webhook_deliveries" (
          "id", "subscriptionId", "eventName", "payload",
          "status", "responseStatus", "responseBody", "attempts", "nextRetryAt"
        ) VALUES (
          ${delivery.id},
          ${delivery.subscriptionId},
          ${delivery.eventName},
          ${sql.jsonb(delivery.payload as any)},
          ${delivery.status},
          ${delivery.responseStatus},
          ${delivery.responseBody},
          ${delivery.attempts},
          ${delivery.nextRetryAt ? delivery.nextRetryAt.toISOString() : null}
        )
      `,
    );
  }

  async updateDelivery(
    id: string,
    status: string,
    responseStatus: number | null,
    responseBody: string | null,
    attempts: number,
    nextRetryAt: Date | null,
  ): Promise<void> {
    await this.pool.query(
      sql.unsafe`
        UPDATE "webhook_deliveries"
        SET
          "status" = ${status},
          "responseStatus" = ${responseStatus},
          "responseBody" = ${responseBody},
          "attempts" = ${attempts},
          "nextRetryAt" = ${nextRetryAt ? nextRetryAt.toISOString() : null}
        WHERE "id" = ${id}
      `,
    );
  }
}
