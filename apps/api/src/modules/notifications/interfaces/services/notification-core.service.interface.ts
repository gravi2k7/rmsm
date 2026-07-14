import type { Notification, NotificationDelivery, NotificationChannel, NotificationPriority, NotificationType } from "@rmsm/database";

export interface SendNotificationInput {
  organizationId: string;
  type: NotificationType;
  channel: NotificationChannel;
  priority?: NotificationPriority;
  /**
   * Phase 2c correction: was `categoryKey` in the original Phase 1 draft.
   * No `NotificationCategory` repository exists yet (deferred in Phase
   * 2a — no corresponding service needs it this phase, unlike
   * NotificationSchedule/NotificationDigest/NotificationWebhook, whose
   * corresponding services — NotificationScheduler/DigestService/
   * WebhookService — are built this phase). Accepting an already-resolved
   * `categoryId` here avoids inventing category-key resolution logic
   * this phase doesn't need; a future category-management layer can
   * resolve a human-facing key to an id before calling this.
   */
  categoryId?: string;
  templateKey?: string;
  recipientUserId?: string;
  recipientRole?: string;
  recipientPermission?: string;
  topic?: string;
  subject?: string;
  body?: string;
  variables?: Record<string, unknown>;
  locale?: string;
  scheduledFor?: Date;
  /** Null for system-initiated sends (a fired schedule, a digest) — never a fake string like "system", which would violate AuditLog.userId's real FK to User. */
  actorId: string | null;
}

/**
 * The orchestration service every controller endpoint ultimately calls.
 * Resolves recipients (per NotificationType), renders the template (if
 * one is referenced) via TemplateEngine, checks PreferenceService before
 * enqueueing, and hands off to QueueService — the same
 * "controller → service → provider registry" shape Module 004 established
 * for billing, applied here to a fan-out (one Notification can produce
 * many NotificationDelivery rows) rather than a 1:1 flow.
 */
export interface INotificationService {
  send(input: SendNotificationInput): Promise<Notification>;
  sendBulk(inputs: SendNotificationInput[]): Promise<Notification[]>;
  schedule(input: SendNotificationInput & { scheduledFor: Date }): Promise<Notification>;
  getById(organizationId: string, id: string): Promise<Notification>;
  listForUser(userId: string, organizationId: string, take: number, skip: number): Promise<{ items: Notification[]; total: number }>;
  markRead(organizationId: string, id: string, userId: string): Promise<Notification>;
  markArchived(organizationId: string, id: string, userId: string): Promise<Notification>;
  delete(organizationId: string, id: string, userId: string): Promise<void>;
}

export interface IDeliveryService {
  recordAttempt(notificationId: string, channel: NotificationChannel): Promise<NotificationDelivery>;
  recordSuccess(deliveryId: string, providerMessageId: string): Promise<NotificationDelivery>;
  recordFailure(deliveryId: string, reason: string): Promise<NotificationDelivery>;
  /** Applies provider failover (spec Section: "Provider failover") — if the default provider's send fails, retries against the next configured provider for the same channel before giving up. */
  getFailoverOrder(organizationId: string, channel: NotificationChannel): Promise<string[]>;
}

export interface ITrackingService {
  recordOpen(deliveryId: string): Promise<void>;
  recordClick(deliveryId: string, url: string): Promise<void>;
  recordBounce(deliveryId: string, reason: string, isPermanent: boolean): Promise<void>;
  getDeliveryStats(notificationId: string): Promise<{ sent: number; delivered: number; opened: number; clicked: number; bounced: number }>;
}
