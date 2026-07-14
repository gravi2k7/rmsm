import { Injectable } from "@nestjs/common";
import { QueueJob } from "../interfaces/queue-adapter.interface";
import { BullMqQueueAdapter } from "../providers/bullmq-queue-adapter";
import { NotificationQueueRepository, CreateQueueEntryInput } from "../repositories/notification-queue.repository";

/**
 * Keeps NotificationQueueRepository's durable, queryable record (Phase 2a)
 * in sync with BullMQ's actual job state (Phase 2b's BullMqQueueAdapter)
 * — ADR-017. `enqueue()` creates the NotificationQueue row FIRST, then
 * enqueues to BullMQ using that row's own id as the explicit BullMQ job
 * id (EnqueueOptions.jobId, added this phase) — one shared identifier
 * across both systems, so moveToDeadLetter()/retry() never need to
 * correlate two separately-generated ids.
 */
@Injectable()
export class QueueService {
  constructor(
    private readonly queueAdapter: BullMqQueueAdapter,
    private readonly queueRepository: NotificationQueueRepository,
  ) {}

  async enqueue(entry: CreateQueueEntryInput): Promise<QueueJob<{ notificationId: string }>> {
    const queueEntry = await this.queueRepository.create(entry);
    return this.queueAdapter.enqueue(
      { notificationId: entry.notificationId },
      {
        queueName: entry.queueName,
        priority: entry.priority,
        delayMs: entry.scheduledFor ? entry.scheduledFor.getTime() - Date.now() : undefined,
        maxAttempts: entry.maxAttempts,
        jobId: queueEntry.id,
      },
    );
  }

  /**
   * Phase 4 addition — Phase 3's workers called dispatch() but never
   * reported outcomes back to the durable NotificationQueue table,
   * leaving it permanently stuck at PENDING regardless of what actually
   * happened. Real bug, fixed here: QueueEventTracker (this phase) calls
   * these from each processor's `@OnWorkerEvent` hooks so the durable
   * record actually reflects BullMQ's real state.
   */
  async markCompleted(id: string): Promise<void> {
    await this.queueRepository.updateStatus(id, "COMPLETED");
  }

  /** A non-final failed attempt — BullMQ will retry on its own backoff schedule; this only updates the durable record's attempt count/last error, it does not touch BullMQ's own retry state. */
  async recordRetryAttempt(id: string, error: string): Promise<void> {
    await this.queueRepository.incrementAttempts(id, error);
  }

  /** id is the shared NotificationQueue-row-id-as-BullMQ-job-id (see class comment). Called by QueueEventTracker (Phase 4) when a BullMQ job exhausts its final retry attempt. */
  async moveToDeadLetter(id: string, queueName: string, reason: string): Promise<void> {
    await this.queueAdapter.moveToDeadLetter(id, queueName, reason);
    await this.queueRepository.moveToDeadLetter(id, reason);
  }

  async retry(id: string, queueName: string): Promise<void> {
    await this.queueAdapter.retry(id, queueName);
    await this.queueRepository.updateStatus(id, "PENDING");
  }

  async retryFailed(queueName: string): Promise<number> {
    const deadLetterEntries = await this.queueRepository.findDeadLetter(queueName, 100);
    for (const entry of deadLetterEntries) {
      await this.retry(entry.id, queueName);
    }
    return deadLetterEntries.length;
  }
}
