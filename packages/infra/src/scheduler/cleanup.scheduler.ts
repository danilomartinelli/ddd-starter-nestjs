import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { IdempotencyRepository } from "../idempotency/idempotency.repository";
import { DeadLetterService } from "../dead-letter/dead-letter.service";

@Injectable()
export class CleanupScheduler {
  private readonly logger = new Logger(CleanupScheduler.name);

  constructor(
    private readonly idempotencyRepository: IdempotencyRepository,
    private readonly deadLetterService: DeadLetterService,
  ) {}

  @Cron("0 * * * *")
  async cleanupExpiredIdempotencyKeys(): Promise<void> {
    this.logger.log("Running cleanup of expired idempotency keys");
    try {
      await this.idempotencyRepository.deleteExpired();
    } catch (error: any) {
      this.logger.error(
        `Failed to cleanup expired idempotency keys: ${error.message}`,
      );
    }
  }

  @Cron("*/5 * * * *")
  async retryFailedEvents(): Promise<void> {
    this.logger.log("Running retry of failed events");
    try {
      const result = await this.deadLetterService.retryFailedEvents();
      this.logger.log(
        `Retry completed: ${result.succeeded} succeeded, ${result.failed} failed, ${result.exhausted} exhausted`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to retry failed events: ${error.message}`);
    }
  }
}
