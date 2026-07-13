import type {
  DbClient,
  NotificationTemplate,
  NotificationCategory,
  EmailProvider,
  SmsProvider,
  PushProvider,
  NotificationChannel,
} from "@rmsm/database";

export interface INotificationTemplateRepository {
  create(data: Partial<NotificationTemplate>, client?: DbClient): Promise<NotificationTemplate>;
  findByKey(organizationId: string | null, key: string, locale: string, client?: DbClient): Promise<NotificationTemplate | null>;
  findById(id: string, client?: DbClient): Promise<NotificationTemplate | null>;
  findByOrganization(organizationId: string, channel?: NotificationChannel, client?: DbClient): Promise<NotificationTemplate[]>;
  update(id: string, data: Partial<NotificationTemplate>, client?: DbClient): Promise<NotificationTemplate>;
  softDelete(id: string, client?: DbClient): Promise<NotificationTemplate>;
}

export interface INotificationCategoryRepository {
  create(data: Partial<NotificationCategory>, client?: DbClient): Promise<NotificationCategory>;
  findByKey(organizationId: string | null, key: string, client?: DbClient): Promise<NotificationCategory | null>;
  findAll(organizationId: string, client?: DbClient): Promise<NotificationCategory[]>;
}

export interface IEmailProviderRepository {
  create(data: Partial<EmailProvider>, client?: DbClient): Promise<EmailProvider>;
  findDefault(organizationId: string | null, client?: DbClient): Promise<EmailProvider | null>;
  findByOrganization(organizationId: string, client?: DbClient): Promise<EmailProvider[]>;
  update(id: string, data: Partial<EmailProvider>, client?: DbClient): Promise<EmailProvider>;
}

export interface ISmsProviderRepository {
  create(data: Partial<SmsProvider>, client?: DbClient): Promise<SmsProvider>;
  findDefault(organizationId: string | null, client?: DbClient): Promise<SmsProvider | null>;
  findByOrganization(organizationId: string, client?: DbClient): Promise<SmsProvider[]>;
}

export interface IPushProviderRepository {
  create(data: Partial<PushProvider>, client?: DbClient): Promise<PushProvider>;
  findDefault(organizationId: string | null, client?: DbClient): Promise<PushProvider | null>;
  findByOrganization(organizationId: string, client?: DbClient): Promise<PushProvider[]>;
}
