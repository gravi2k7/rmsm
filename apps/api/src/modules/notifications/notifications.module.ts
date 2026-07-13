import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsModule } from "../organizations/organizations.module";
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
import { EmailQueueProcessor } from "./workers/email-queue.processor";
import { SmsQueueProcessor } from "./workers/sms-queue.processor";
import { PushQueueProcessor } from "./workers/push-queue.processor";
import { ScheduledQueueProcessor } from "./workers/scheduled-queue.processor";
import { DigestQueueProcessor } from "./workers/digest-queue.processor";
import { NotificationCronRegistrar } from "./workers/notification-cron.registrar";
import { NotificationController } from "./notification.controller";
import { NotificationPreferenceController } from "./notification-preference.controller";
import { DeviceTokenController } from "./device-token.controller";
import { WebhookController } from "./webhook.controller";
import { NotificationTemplateController } from "./notification-template.controller";
import { AdminNotificationController } from "./admin-notification.controller";

/**
 * Phase 2a: 14 repositories. Phase 2b: provider infrastructure. Phase 2c:
 * 12 services. Phase 3 (this addition): 6 controllers, 5 BullMQ workers
 * (one per queue), and a cron-sweep registrar using BullMQ's native
 * repeatable-job feature (ADR-017 — no `@nestjs/schedule` dependency
 * added). Imports OrganizationsModule for OrganizationRoleGuard's own
 * dependency, the same pattern BillingModule already established.
 * Controllers remain Phase 3.
 */
@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    BullModule.registerQueue(
      { name: "email" },
      { name: "sms" },
      { name: "push" },
      { name: "digest" },
      { name: "scheduled" },
    ),
  ],
  controllers: [
    NotificationController,
    NotificationPreferenceController,
    DeviceTokenController,
    WebhookController,
    NotificationTemplateController,
    AdminNotificationController,
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
    EmailQueueProcessor,
    SmsQueueProcessor,
    PushQueueProcessor,
    ScheduledQueueProcessor,
    DigestQueueProcessor,
    NotificationCronRegistrar,
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
