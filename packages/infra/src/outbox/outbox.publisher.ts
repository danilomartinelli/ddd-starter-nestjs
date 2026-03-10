import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { OutboxRepository } from "./outbox.repository";

@Injectable()
export class OutboxPublisher {
  private readonly logger = new Logger(OutboxPublisher.name);

  constructor(
    private readonly repository: OutboxRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron("*/10 * * * * *")
  async publishPendingEvents(): Promise<void> {
    const unpublished = await this.repository.findUnpublished();

    if (unpublished.length === 0) {
      return;
    }

    this.logger.log(`Found ${unpublished.length} unpublished outbox events`);

    const publishedIds: string[] = [];

    for (const event of unpublished) {
      try {
        await this.eventEmitter.emitAsync(event.eventName, event.payload);
        publishedIds.push(event.id);
        this.logger.debug(
          `Published outbox event "${event.eventName}" (id=${event.id})`,
        );
      } catch (error: any) {
        this.logger.error(
          `Failed to publish outbox event "${event.eventName}" (id=${event.id}): ${error.message}`,
        );
      }
    }

    if (publishedIds.length > 0) {
      await this.repository.markPublished(publishedIds);
      this.logger.log(
        `Successfully published ${publishedIds.length}/${unpublished.length} outbox events`,
      );
    }
  }
}
