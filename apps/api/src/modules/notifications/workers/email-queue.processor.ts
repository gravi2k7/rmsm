import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationService } from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { QueueEventTracker } from "../services/queue-event-tracker.service";

interface NotificationJobPayload {
  notificationId: string;
}

/**
 * Consumes `{notificationId}` jobs enqueued by NotificationService.send()
 * when a send is scheduled/delayed (immediate sends dispatch synchronously
 * and never touch this queue). Fetches the Notification row and hands it
 * to NotificationService.dispatch() — the same dispatch path an immediate
 * send uses, so channel-routing/failover logic isn't duplicated between
 * "send now" and "send later."
 *
 * Retry/dead-letter (Phase 4): a thrown error here is caught by BullMQ,
 * which retries per the job's configured `attempts`/`backoff` (set at
 * enqueue time, QueueService.enqueue) automatically — this processor
 * doesn't implement retry logic itself. The `@OnWorkerEvent` hooks below
 * report the outcome to QueueEventTracker, which updates the durable
 * NotificationQueue record and — on the final exhausted attempt — moves
 * the job to the dead-letter state. Before this phase, nothing reported
 * outcomes back to that table at all, leaving it permanently stuck at
 * PENDING; a real, fixed gap, not a pre-existing feature.
 */
@Processor("email")
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
    private readonly eventTracker: QueueEventTracker,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const notification = await this.notificationRepository.findById(job.data.notificationId);
    if (!notification) {
      this.logger.warn(`Email queue job ${job.id}: notification ${job.data.notificationId} not found (likely deleted) — skipping.`);
      return;
    }
    await this.notificationService.dispatch(notification);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): Promise<void> {
    return this.eventTracker.handleCompleted(job, "email");
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): Promise<void> {
    return this.eventTracker.handleFailed(job, "email", error);
  }
}
