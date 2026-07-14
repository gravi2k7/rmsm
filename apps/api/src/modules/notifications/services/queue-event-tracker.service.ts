import { Injectable, Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { AuditService } from "../../auth/services/audit.service";
import { QueueService } from "./queue.service";
import { NotificationRepository } from "../repositories/notification.repository";
import { NotificationMetricsService } from "./notification-metrics.service";

/**
 * Centralizes retry/dead-letter bookkeeping for every queue processor —
 * one implementation, not duplicated across 5 `@Processor` classes
 * (Module 005's "no duplicated code" standard). Each processor's own
 * `@OnWorkerEvent('completed'|'failed')` hooks are one-line delegations
 * to this service; the actual "is this the final attempt, dead-letter it"
 * decision lives here exactly once.
 *
 * Only acts on jobs named "notification" (an individual per-notification
 * job with a real NotificationQueue row) — the periodic "sweep-schedules"/
 * "sweep-digests" jobs have no such row and are explicitly skipped, not
 * silently mishandled.
 */
@Injectable()
export class QueueEventTracker {
  private readonly logger = new Logger(QueueEventTracker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationRepository: NotificationRepository,
    private readonly auditService: AuditService,
    private readonly metrics: NotificationMetricsService,
  ) {}

  async handleCompleted(job: Job, queueName: string): Promise<void> {
    if (job.name !== "notification" || !job.id) return;
    await this.queueService.markCompleted(job.id);
    this.metrics.increment(`queue.${queueName}.completed`);
  }

  async handleFailed(job: Job | undefined, queueName: string, error: Error): Promise<void> {
    if (!job || job.name !== "notification" || !job.id) return;

    const maxAttempts = job.opts.attempts ?? 5;
    const isFinalAttempt = job.attemptsMade >= maxAttempts;

    if (!isFinalAttempt) {
      await this.queueService.recordRetryAttempt(job.id, error.message);
      this.metrics.increment(`queue.${queueName}.retried`);
      this.logger.warn(`Job ${job.id} on "${queueName}" failed (attempt ${job.attemptsMade}/${maxAttempts}), will retry: ${error.message}`);
      return;
    }

    await this.queueService.moveToDeadLetter(job.id, queueName, error.message);
    this.metrics.increment(`queue.${queueName}.dead_lettered`);

    const notificationId = (job.data as { notificationId?: string }).notificationId;
    if (notificationId) {
      await this.notificationRepository.updateStatus(notificationId, "FAILED");
    }

    await this.auditService.log("notification.queue.dead_lettered", {
      entityType: "NotificationQueue",
      entityId: job.id,
      metadata: { queueName, reason: error.message, attemptsMade: job.attemptsMade },
    });

    this.logger.error(`Job ${job.id} on "${queueName}" exhausted all ${maxAttempts} attempts — moved to dead-letter: ${error.message}`);
  }
}
