import { Injectable } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { ValidationError } from "@rmsm/shared";
import { QueueAdapter, EnqueueOptions, QueueJob } from "../interfaces/queue-adapter.interface";

const PRIORITY_TO_BULLMQ: Record<string, number> = {
  URGENT: 1,
  HIGH: 2,
  NORMAL: 3,
  LOW: 4,
};

/**
 * Implements Phase 1's `QueueAdapter` contract as a thin wrapper around
 * Module 001's existing BullMQ connection (`QueueModule`, `@Global()`,
 * already provides the Redis connection this reuses — no second Redis
 * connection, per ADR-017). Named queues (`email`, `sms`, `push`,
 * `digest`, `scheduled`) are registered in `NotificationsModule` via
 * `BullModule.registerQueue()` and injected here by name.
 */
@Injectable()
export class BullMqQueueAdapter implements QueueAdapter {
  private readonly queues: Map<string, Queue>;

  constructor(
    @InjectQueue("email") emailQueue: Queue,
    @InjectQueue("sms") smsQueue: Queue,
    @InjectQueue("push") pushQueue: Queue,
    @InjectQueue("digest") digestQueue: Queue,
    @InjectQueue("scheduled") scheduledQueue: Queue,
  ) {
    this.queues = new Map([
      ["email", emailQueue],
      ["sms", smsQueue],
      ["push", pushQueue],
      ["digest", digestQueue],
      ["scheduled", scheduledQueue],
    ]);
  }

  private resolveQueue(queueName: string): Queue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new ValidationError(
        `Unknown queue "${queueName}". Registered queues: ${[...this.queues.keys()].join(", ")}.`,
      );
    }
    return queue;
  }

  async enqueue<T>(payload: T, options: EnqueueOptions): Promise<QueueJob<T>> {
    const queue = this.resolveQueue(options.queueName);
    const job = await queue.add("notification", payload, {
      jobId: options.jobId,
      priority: PRIORITY_TO_BULLMQ[options.priority ?? "NORMAL"],
      delay: options.delayMs,
      attempts: options.maxAttempts ?? 5,
      backoff: { type: "exponential", delay: 5000 },
    });
    return { id: job.id ?? "", queueName: options.queueName, payload, attempts: 0 };
  }

  async moveToDeadLetter(jobId: string, queueName: string, reason: string): Promise<void> {
    const queue = this.resolveQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) return;
    // BullMQ has no built-in "dead letter queue" primitive — the
    // convention this adapter uses is a dedicated failed-job record: move
    // the job's data into the same queue's failed set with the reason
    // attached, then discard the original. NotificationQueueRepository
    // (Phase 2a) is the durable, queryable dead-letter record an admin
    // dashboard actually reads from (ADR-017) — this method's job is only
    // to stop BullMQ from retrying it further.
    await job.discard();
    await job.moveToFailed(new Error(reason), "0", false);
  }

  async retry(jobId: string, queueName: string): Promise<void> {
    const queue = this.resolveQueue(queueName);
    const job = await queue.getJob(jobId);
    if (!job) throw new ValidationError(`Job "${jobId}" not found in queue "${queueName}".`);
    await job.retry();
  }
}
