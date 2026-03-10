import { Inject, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { WebhookRepository } from "./webhook.repository";
import { WebhookSigner } from "./webhook.signer";
import { WebhookOptions, WEBHOOK_OPTIONS } from "./webhook.types";

@Injectable()
export class WebhookDispatcher {
  private readonly logger = new Logger(WebhookDispatcher.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;
  private readonly timeoutMs: number;

  constructor(
    private readonly repository: WebhookRepository,
    private readonly signer: WebhookSigner,
    @Inject(WEBHOOK_OPTIONS) options: WebhookOptions,
  ) {
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 5000;
    this.timeoutMs = options.timeoutMs ?? 10000;
  }

  async dispatch(eventName: string, payload: unknown): Promise<void> {
    const subscriptions = await this.repository.findActiveByEvent(eventName);

    if (subscriptions.length === 0) {
      this.logger.debug(
        `No active webhook subscriptions for event: ${eventName}`,
      );
      return;
    }

    await Promise.allSettled(
      subscriptions.map((subscription) =>
        this.deliverToSubscription(subscription, eventName, payload),
      ),
    );
  }

  private async deliverToSubscription(
    subscription: { id: string; url: string; secret: string },
    eventName: string,
    payload: unknown,
  ): Promise<void> {
    const deliveryId = randomUUID();
    const body = JSON.stringify(payload);
    const signature = this.signer.sign(body, subscription.secret);

    await this.repository.insertDelivery({
      id: deliveryId,
      subscriptionId: subscription.id,
      eventName,
      payload,
      status: "pending",
      responseStatus: null,
      responseBody: null,
      attempts: 0,
      nextRetryAt: null,
    });

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(subscription.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Signature": signature,
          "X-Webhook-Event": eventName,
          "X-Webhook-Delivery": deliveryId,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const responseBody = await response.text();

      if (response.ok) {
        await this.repository.updateDelivery(
          deliveryId,
          "success",
          response.status,
          responseBody,
          1,
          null,
        );
        this.logger.debug(
          `Webhook delivered successfully to ${subscription.url}`,
        );
      } else {
        const nextRetryAt = new Date(Date.now() + this.retryDelayMs);
        await this.repository.updateDelivery(
          deliveryId,
          "failed",
          response.status,
          responseBody,
          1,
          nextRetryAt,
        );
        this.logger.warn(
          `Webhook delivery to ${subscription.url} failed with status ${response.status}`,
        );
      }
    } catch (error: any) {
      const nextRetryAt = new Date(Date.now() + this.retryDelayMs);
      await this.repository.updateDelivery(
        deliveryId,
        "failed",
        null,
        error.message ?? "Unknown error",
        1,
        nextRetryAt,
      );
      this.logger.error(
        `Webhook delivery to ${subscription.url} failed: ${error.message}`,
      );
    }
  }
}
