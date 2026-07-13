import type {
  DbClient,
  NotificationPreference,
  DeviceToken,
  NotificationWebhook,
  NotificationChannel,
} from "@rmsm/database";

export interface INotificationPreferenceRepository {
  upsert(data: Partial<NotificationPreference>, client?: DbClient): Promise<NotificationPreference>;
  findByUser(userId: string, organizationId: string, client?: DbClient): Promise<NotificationPreference[]>;
  /** The specific lookup PreferenceService needs before every send: "is this user opted in for this category+channel." Falls back through category=null/channel=null wildcards — resolution order is a Phase 2 service-layer concern, not this repository's. */
  findApplicable(userId: string, organizationId: string, categoryId: string | null, channel: NotificationChannel, client?: DbClient): Promise<NotificationPreference[]>;
}

export interface IDeviceTokenRepository {
  create(data: Partial<DeviceToken>, client?: DbClient): Promise<DeviceToken>;
  findByToken(token: string, client?: DbClient): Promise<DeviceToken | null>;
  findActiveByUser(userId: string, client?: DbClient): Promise<DeviceToken[]>;
  deactivate(id: string, client?: DbClient): Promise<DeviceToken>;
}

export interface INotificationWebhookRepository {
  create(data: Partial<NotificationWebhook>, client?: DbClient): Promise<NotificationWebhook>;
  findActiveByOrganization(organizationId: string, eventType: string, client?: DbClient): Promise<NotificationWebhook[]>;
  updateLastTriggered(id: string, status: string, client?: DbClient): Promise<NotificationWebhook>;
}
