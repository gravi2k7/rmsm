import { Injectable, Logger } from "@nestjs/common";
import type { EmailProviderId } from "../contracts/email-platform.contracts";
import type { EmailTrackingRecord } from "../types/email-platform.types";

/**
 * EM-001's own Tracking section: Sent, Delivered, Failed, Retry Count,
 * Processing Time. In-memory only this milestone — no `Delivered`
 * webhook ingestion path exists yet (that would require standing up
 * inbound provider webhooks, out of EM-001's own scope list), so
 * `recordSent()`/`recordFailed()` are the two states this milestone's
 * `EmailQueueService` actually drives; `markDelivered()` exists on the
 * public API for a future webhook handler to call without a class
 * redesign.
 */
@Injectable()
export class EmailTrackerService {
  private readonly logger = new Logger(EmailTrackerService.name);
  private readonly records = new Map<string, EmailTrackingRecord>();

  recordSent(messageId: string, provider: EmailProviderId, retryCount: number, processingTimeMs: number): void {
    const record: EmailTrackingRecord = { messageId, provider, status: "SENT", retryCount, processingTimeMs, sentAt: new Date() };
    this.records.set(messageId, record);
    this.logger.log({ msg: "email.tracked.sent", messageId, provider, retryCount, processingTimeMs });
  }

  recordFailed(messageId: string, provider: EmailProviderId, retryCount: number, processingTimeMs: number, error: string): void {
    const record: EmailTrackingRecord = { messageId, provider, status: "FAILED", retryCount, processingTimeMs, failedAt: new Date(), error };
    this.records.set(messageId, record);
    this.logger.warn({ msg: "email.tracked.failed", messageId, provider, retryCount, processingTimeMs, error });
  }

  markDelivered(messageId: string): void {
    const record = this.records.get(messageId);
    if (!record) return;
    this.records.set(messageId, { ...record, status: "DELIVERED" });
  }

  get(messageId: string): EmailTrackingRecord | undefined {
    return this.records.get(messageId);
  }

  listAll(): EmailTrackingRecord[] {
    return [...this.records.values()];
  }

  /** Used by `EmailHealthProvider`'s "Queue Status" check — a coarse recent-failure-rate signal, not a full metrics system. */
  recentFailureRate(sampleSize = 20): number {
    const recent = [...this.records.values()].slice(-sampleSize);
    if (recent.length === 0) return 0;
    return recent.filter((r) => r.status === "FAILED").length / recent.length;
  }
}
