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

  /** id is the shared NotificationQueue-row-id-as-BullMQ-job-id (see class comment). Called by a BullMQ worker process (not built this phase — worker registration is a deployment-topology decision, out of this service's scope) after a job fails its final attempt. */
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
