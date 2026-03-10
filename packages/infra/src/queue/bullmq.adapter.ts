import { Injectable, Logger, OnModuleDestroy, Inject } from "@nestjs/common";
import { Queue, type ConnectionOptions } from "bullmq";
import { QueuePort } from "./queue.port";
import { EnqueueOptions, QueueOptions } from "./queue.types";

export const QUEUE_OPTIONS = "QUEUE_OPTIONS";

@Injectable()
export class BullMqAdapter implements QueuePort, OnModuleDestroy {
  private readonly logger = new Logger(BullMqAdapter.name);
  private readonly queues = new Map<string, Queue>();
  private readonly connectionOptions: ConnectionOptions;

  constructor(@Inject(QUEUE_OPTIONS) private readonly options: QueueOptions) {
    this.connectionOptions = {
      host: options.redisHost,
      port: options.redisPort,
      password: options.redisPassword || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
    };
  }

  async onModuleDestroy(): Promise<void> {
    const closePromises: Promise<void>[] = [];
    for (const [name, queue] of this.queues) {
      this.logger.log(`Closing queue "${name}"`);
      closePromises.push(queue.close());
    }
    await Promise.all(closePromises);
  }

  private getOrCreateQueue(queueName: string): Queue {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, { connection: this.connectionOptions });
      this.queues.set(queueName, queue);
      this.logger.log(`Created queue "${queueName}"`);
    }
    return queue;
  }

  async enqueue(
    queueName: string,
    jobName: string,
    data: unknown,
    opts?: EnqueueOptions,
  ): Promise<string> {
    const queue = this.getOrCreateQueue(queueName);
    const job = await queue.add(jobName, data, {
      delay: opts?.delay,
      attempts: opts?.attempts,
      backoff: opts?.backoff,
      priority: opts?.priority,
      removeOnComplete: opts?.removeOnComplete ?? true,
      removeOnFail: opts?.removeOnFail ?? false,
    });
    this.logger.debug(
      `Enqueued job "${jobName}" on queue "${queueName}" (id=${job.id})`,
    );
    return job.id!;
  }

  async schedule(
    queueName: string,
    jobName: string,
    data: unknown,
    delay: number,
  ): Promise<string> {
    return this.enqueue(queueName, jobName, data, { delay });
  }
}
