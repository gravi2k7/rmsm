import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationService } from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationScheduler } from "../services/notification-scheduler.service";
import { QueueEventTracker } from "../services/queue-event-tracker.service";

/**
 * Handles two distinct job shapes on the same queue, distinguished by
 * BullMQ's job `name` field:
 *  - "notification": a single delayed send (an IN_APP/WEBHOOK-channel
 *    scheduled notification, or any channel that isn't email/sms/push —
 *    those three have their own dedicated queues) — dispatches it.
 *  - "sweep-schedules": the periodic repeatable job (registered by
 *    NotificationCronRegistrar) that evaluates every due
 *    NotificationSchedule and fires the notifications they describe.
 *    QueueEventTracker deliberately ignores this job name (Section: its
 *    own class comment) — sweep jobs have no NotificationQueue row to
 *    update.
 */
@Processor("scheduled")
export class ScheduledQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledQueueProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
    private readonly scheduler: NotificationScheduler,
    private readonly eventTracker: QueueEventTracker,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === "sweep-schedules") {
      const result = await this.scheduler.processDueSchedules(new Date());
      this.logger.log(`Schedule sweep: ${result.processed} processed, ${result.failed} failed.`);
      return;
    }

    const notificationId = (job.data as { notificationId: string }).notificationId;
    const notification = await this.notificationRepository.findById(notificationId);
    if (!notification) {
      this.logger.warn(`Scheduled queue job ${job.id}: notification ${notificationId} not found — skipping.`);
      return;
    }
    await this.notificationService.dispatch(notification);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): Promise<void> {
    return this.eventTracker.handleCompleted(job, "scheduled");
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): Promise<void> {
    return this.eventTracker.handleFailed(job, "scheduled", error);
  }
}
