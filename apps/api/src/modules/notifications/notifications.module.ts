import { Module } from "@nestjs/common";
import { NotificationRepository } from "./repositories/notification.repository";
import { NotificationTemplateRepository } from "./repositories/notification-template.repository";
import { NotificationPreferenceRepository } from "./repositories/notification-preference.repository";
import { NotificationQueueRepository } from "./repositories/notification-queue.repository";
import { NotificationDeliveryRepository } from "./repositories/notification-delivery.repository";
import { NotificationEventRepository } from "./repositories/notification-event.repository";
import { NotificationLogRepository } from "./repositories/notification-log.repository";
import { DeviceTokenRepository } from "./repositories/device-token.repository";
import { EmailProviderRepository } from "./repositories/email-provider.repository";
import { SmsProviderRepository } from "./repositories/sms-provider.repository";
import { PushProviderRepository } from "./repositories/push-provider.repository";

/**
 * Phase 2a scope: the 11 repositories explicitly requested this phase.
 * Providers, services, controllers remain later phases (Phase 2b/2c/3 per
 * MODULE_005_PHASE_2_PLAN.md). Five Phase 1 models
 * (NotificationCategory, NotificationAttachment, NotificationSchedule,
 * NotificationDigest, NotificationWebhook) have no repository yet — not
 * in this phase's explicit deliverable list, flagged in this phase's doc
 * rather than silently expanded into scope.
 */
@Module({
  providers: [
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,
    NotificationQueueRepository,
    NotificationDeliveryRepository,
    NotificationEventRepository,
    NotificationLogRepository,
    DeviceTokenRepository,
    EmailProviderRepository,
    SmsProviderRepository,
    PushProviderRepository,
  ],
  exports: [
    NotificationRepository,
    NotificationTemplateRepository,
    NotificationPreferenceRepository,
    NotificationQueueRepository,
    NotificationDeliveryRepository,
    NotificationEventRepository,
    NotificationLogRepository,
    DeviceTokenRepository,
    EmailProviderRepository,
    SmsProviderRepository,
    PushProviderRepository,
  ],
})
export class NotificationsModule {}
