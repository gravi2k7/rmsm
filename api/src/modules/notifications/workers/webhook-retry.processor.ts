import { OnWorkerEvent, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { WebhookService } from "../services/webhook.service";
import { QueueEventTracker } from "../services/queue-event-tracker.service";

interface WebhookRetryPayload {
  webhookId: string;
  organizationId: string;
  eventType: string;
  payload: Record<string, unknown>;
}

/** Consumes the "webhook" queue — WebhookService.publishFailureAndScheduleRetry's retry jobs. See webhook.service.ts's own doc comment for why this exists. */
@Processor("webhook")
export class WebhookRetryProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookRetryProcessor.name);

  constructor(
    private readonly webhookService: WebhookService,
    private readonly eventTracker: QueueEventTracker,
  ) {
    super();
  }

  async process(job: Job<WebhookRetryPayload>): Promise<void> {
    await this.webhookService.retryDelivery(job.data.webhookId, job.data.eventType, job.data.payload);
  }

  @OnWorkerEvent("completed")
  onCompleted(job: Job): Promise<void> {
    return this.eventTracker.handleCompleted(job, "webhook");
  }

  @OnWorkerEvent("failed")
  onFailed(job: Job | undefined, error: Error): Promise<void> {
    return this.eventTracker.handleFailed(job, "webhook", error);
  }
}
