import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
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
import { NotificationScheduleRepository } from "./repositories/notification-schedule.repository";
import { NotificationDigestRepository } from "./repositories/notification-digest.repository";
import { NotificationWebhookRepository } from "./repositories/notification-webhook.repository";
import { CredentialEncryptionService } from "./providers/shared/credential-encryption";
import { ProviderFactory } from "./providers/provider-factory";
import { EmailProviderRegistry } from "./providers/email/email-provider.registry";
import { SmsProviderRegistry } from "./providers/sms/sms-provider.registry";
import { PushProviderRegistry } from "./providers/push/push-provider.registry";
import { RmsmTemplateEngine } from "./providers/rmsm-template-engine";
import { BullMqQueueAdapter } from "./providers/bullmq-queue-adapter";
import { TemplateService } from "./services/template.service";
import { PreferenceService } from "./services/preference.service";
import { QueueService } from "./services/queue.service";
import { DeliveryService } from "./services/delivery.service";
import { TrackingService } from "./services/tracking.service";
import { EmailService } from "./services/email.service";
import { SmsService } from "./services/sms.service";
import { PushService } from "./services/push.service";
import { WebhookService } from "./services/webhook.service";
import { NotificationService } from "./services/notification.service";
import { NotificationScheduler } from "./services/notification-scheduler.service";
import { DigestService } from "./services/digest.service";

/**
 * Phase 2a: 14 repositories (11 original + 3 added this phase — see
 * Phase 2c doc Section 1 for why NotificationSchedule/NotificationDigest/
 * NotificationWebhook's repositories arrived now rather than staying
 * deferred). Phase 2b: provider infrastructure. Phase 2c (this addition):
 * all 12 net-new services (ProviderRegistry/ProviderFactory were
 * effectively complete as of Phase 2b). Imports AuthModule to reuse
 * AuditService and UserRepository (real recipient email/phone
 * resolution — NotificationService's dispatch() — not a placeholder).
 * Controllers remain Phase 3.
 */
@Module({
  imports: [
    AuthModule,
    BullModule.registerQueue(
      { name: "email" },
      { name: "sms" },
      { name: "push" },
      { name: "digest" },
      { name: "scheduled" },
    ),
  ],
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
    NotificationScheduleRepository,
    NotificationDigestRepository,
    NotificationWebhookRepository,
    CredentialEncryptionService,
    ProviderFactory,
    EmailProviderRegistry,
    SmsProviderRegistry,
    PushProviderRegistry,
    RmsmTemplateEngine,
    BullMqQueueAdapter,
    TemplateService,
    PreferenceService,
    QueueService,
    DeliveryService,
    TrackingService,
    EmailService,
    SmsService,
    PushService,
    WebhookService,
    NotificationService,
    NotificationScheduler,
    DigestService,
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
    NotificationScheduleRepository,
    NotificationDigestRepository,
    NotificationWebhookRepository,
    CredentialEncryptionService,
    ProviderFactory,
    EmailProviderRegistry,
    SmsProviderRegistry,
    PushProviderRegistry,
    RmsmTemplateEngine,
    BullMqQueueAdapter,
    TemplateService,
    PreferenceService,
    QueueService,
    DeliveryService,
    TrackingService,
    EmailService,
    SmsService,
    PushService,
    WebhookService,
    NotificationService,
    NotificationScheduler,
    DigestService,
  ],
})
export class NotificationsModule {}
