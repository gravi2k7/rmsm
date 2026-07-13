import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { NotificationService } from "../services/notification.service";
import { NotificationRepository } from "../repositories/notification.repository";

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
 */
@Processor("email")
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
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
}
