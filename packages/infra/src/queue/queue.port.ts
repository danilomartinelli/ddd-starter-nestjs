import { EnqueueOptions } from "./queue.types";

export interface QueuePort {
  enqueue(
    queueName: string,
    jobName: string,
    data: unknown,
    opts?: EnqueueOptions,
  ): Promise<string>;

  schedule(
    queueName: string,
    jobName: string,
    data: unknown,
    delay: number,
  ): Promise<string>;
}

export const QUEUE_PORT = Symbol("QUEUE_PORT");
