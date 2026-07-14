import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationService } from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { QueueEventTracker } from "../services/queue-event-tracker.service";

interface NotificationJobPayload {
  notificationId: string;
}

/** Same shape as EmailQueueProcessor — see that file's class comment for the retry/dead-letter design. */
@Processor("sms")
export class SmsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsQueueProcessor.name);

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
      this.logger.warn(`SMS queue job ${job.id}: notification ${job.data.notificationId} not found — skipping.`);
      return;
    }
    await this.notificationService.dispatch(notification);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): Promise<void> {
    return this.eventTracker.handleCompleted(job, "sms");
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): Promise<void> {
    return this.eventTracker.handleFailed(job, "sms", error);
  }
}
