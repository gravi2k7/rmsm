import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationService } from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationScheduler } from "../services/notification-scheduler.service";

/**
 * Handles two distinct job shapes on the same queue, distinguished by
 * BullMQ's job `name` field:
 *  - "notification": a single delayed send (an IN_APP/WEBHOOK-channel
 *    scheduled notification, or any channel that isn't email/sms/push —
 *    those three have their own dedicated queues) — dispatches it.
 *  - "sweep-schedules": the periodic repeatable job (registered by
 *    NotificationCronRegistrar) that evaluates every due
 *    NotificationSchedule and fires the notifications they describe.
 */
@Processor("scheduled")
export class ScheduledQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledQueueProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
    private readonly scheduler: NotificationScheduler,
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
}
