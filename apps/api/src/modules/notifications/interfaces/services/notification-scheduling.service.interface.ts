import type { NotificationSchedule, NotificationDigest } from "@rmsm/database";

/** Runs on a schedule (a BullMQ repeatable job, Phase 2) — evaluates every active NotificationSchedule whose nextRunAt has passed and spawns the corresponding Notification(s) via INotificationService. */
export interface INotificationScheduler {
  processDueSchedules(before: Date): Promise<{ processed: number; failed: number }>;
  createSchedule(data: Partial<NotificationSchedule>): Promise<NotificationSchedule>;
  cancelSchedule(id: string): Promise<void>;
}

export interface IDigestService {
  /** Aggregates every notification a user would otherwise have received individually (per their NotificationDigest config) into one digest send, since the last digest run. */
  buildDigest(digestId: string): Promise<{ subject: string; body: string; itemCount: number }>;
  processDueDigests(before: Date): Promise<{ sent: number; skipped: number }>;
  subscribe(userId: string, organizationId: string, categoryKeys: string[], frequency: NotificationDigest["frequency"]): Promise<NotificationDigest>;
}
