import type {
  DbClient,
  Notification,
  NotificationDelivery,
  NotificationEvent,
  NotificationLog,
  NotificationAttachment,
  NotificationStatus,
  DeliveryStatus,
} from "@rmsm/database";

/**
 * Repository contracts (interfaces only — Phase 2 provides the
 * implementations). Every method signature follows this project's
 * established repository shape: single-table, explicit named return
 * types, an optional trailing `client: DbClient` for transaction
 * composition (see Module 003/004's repository layers for the pattern
 * this continues).
 */

export interface INotificationRepository {
  create(data: Partial<Notification>, client?: DbClient): Promise<Notification>;
  findById(id: string, client?: DbClient): Promise<Notification | null>;
  findByRecipient(userId: string, organizationId: string, take: number, skip: number, client?: DbClient): Promise<Notification[]>;
  updateStatus(id: string, status: NotificationStatus, client?: DbClient): Promise<Notification>;
  markRead(id: string, client?: DbClient): Promise<Notification>;
  markArchived(id: string, client?: DbClient): Promise<Notification>;
  softDelete(id: string, client?: DbClient): Promise<Notification>;
}

export interface INotificationDeliveryRepository {
  create(data: Partial<NotificationDelivery>, client?: DbClient): Promise<NotificationDelivery>;
  findByNotification(notificationId: string, client?: DbClient): Promise<NotificationDelivery[]>;
  findByProviderMessageId(providerMessageId: string, client?: DbClient): Promise<NotificationDelivery | null>;
  updateStatus(id: string, status: DeliveryStatus, client?: DbClient): Promise<NotificationDelivery>;
  incrementAttempts(id: string, client?: DbClient): Promise<NotificationDelivery>;
}

export interface INotificationEventRepository {
  create(data: Partial<NotificationEvent>, client?: DbClient): Promise<NotificationEvent>;
  findByNotification(notificationId: string, client?: DbClient): Promise<NotificationEvent[]>;
}

export interface INotificationLogRepository {
  create(data: Partial<NotificationLog>, client?: DbClient): Promise<NotificationLog>;
  findByOrganization(organizationId: string, take: number, client?: DbClient): Promise<NotificationLog[]>;
}

export interface INotificationAttachmentRepository {
  create(data: Partial<NotificationAttachment>, client?: DbClient): Promise<NotificationAttachment>;
  findByNotification(notificationId: string, client?: DbClient): Promise<NotificationAttachment[]>;
}
