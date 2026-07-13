import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
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
import { CredentialEncryptionService } from "./providers/shared/credential-encryption";
import { ProviderFactory } from "./providers/provider-factory";
import { EmailProviderRegistry } from "./providers/email/email-provider.registry";
import { SmsProviderRegistry } from "./providers/sms/sms-provider.registry";
import { PushProviderRegistry } from "./providers/push/push-provider.registry";
import { RmsmTemplateEngine } from "./providers/rmsm-template-engine";
import { BullMqQueueAdapter } from "./providers/bullmq-queue-adapter";

/**
 * Phase 2a: 11 repositories. Phase 2b (this addition): provider
 * infrastructure — CredentialEncryptionService, ProviderFactory, 3
 * registries (Email/SMS/Push), the template engine, and the BullMQ-backed
 * queue adapter. The 11 concrete provider adapter classes (Smtp, Ses,
 * SendGrid, Mailgun, Resend, Twilio, MessageBird, Vonage, AwsSns, Fcm,
 * Apns) are NOT NestJS providers — they're constructed by ProviderFactory
 * via `new` with decrypted credentials, never through DI (see
 * provider-factory.ts's class comment), so they don't appear in this
 * module's `providers` array. Services, controllers remain Phase 2c/3.
 */
@Module({
  imports: [
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
    CredentialEncryptionService,
    ProviderFactory,
    EmailProviderRegistry,
    SmsProviderRegistry,
    PushProviderRegistry,
    RmsmTemplateEngine,
    BullMqQueueAdapter,
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
    CredentialEncryptionService,
    ProviderFactory,
    EmailProviderRegistry,
    SmsProviderRegistry,
    PushProviderRegistry,
    RmsmTemplateEngine,
    BullMqQueueAdapter,
  ],
})
export class NotificationsModule {}
