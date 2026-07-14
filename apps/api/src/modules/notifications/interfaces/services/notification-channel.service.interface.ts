import type { NotificationDelivery } from "@rmsm/database";
import type { EmailMessage } from "../providers/email-provider.interface";
import type { SmsMessage } from "../providers/sms-provider.interface";
import type { PushMessage } from "../providers/push-provider.interface";

/**
 * One service per channel, each depending on its own ProviderRegistry
 * lookup (via IProviderRegistry, see notification-infra.service.interface.ts)
 * — mirrors Module 004's per-provider-type registry pattern, applied
 * three times (email/SMS/push) instead of once (payments).
 */

export interface IEmailService {
  send(organizationId: string, message: EmailMessage): Promise<NotificationDelivery>;
}

export interface ISmsService {
  send(organizationId: string, message: SmsMessage): Promise<NotificationDelivery>;
}

export interface IPushService {
  send(organizationId: string, message: PushMessage): Promise<NotificationDelivery>;
  sendToUser(organizationId: string, userId: string, message: Omit<PushMessage, "deviceToken" | "platform">): Promise<NotificationDelivery[]>;
}

/** Triggers organization-configured OUTBOUND webhooks (NotificationWebhook rows) when a subscribed event occurs — distinct from the INBOUND provider-callback WebhookController the spec also names. */
export interface IWebhookService {
  triggerForEvent(organizationId: string, eventType: string, payload: Record<string, unknown>): Promise<void>;
}
