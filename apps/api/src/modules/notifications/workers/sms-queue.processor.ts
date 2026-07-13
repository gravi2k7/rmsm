import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationService } from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";

interface NotificationJobPayload {
  notificationId: string;
}

/** Same shape as EmailQueueProcessor — see that file's class comment. */
@Processor("sms")
export class SmsQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsQueueProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
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
}
