import { Injectable } from "@nestjs/common";
import { NotificationChannel, NotificationDelivery } from "@rmsm/database";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { NotificationDeliveryRepository } from "../repositories/notification-delivery.repository";
import { EmailProviderRepository } from "../repositories/email-provider.repository";
import { SmsProviderRepository } from "../repositories/sms-provider.repository";
import { PushProviderRepository } from "../repositories/push-provider.repository";
import { NotificationMetricsService } from "./notification-metrics.service";

@Injectable()
export class DeliveryService {
  constructor(
    private readonly deliveryRepository: NotificationDeliveryRepository,
    private readonly emailProviderRepository: EmailProviderRepository,
    private readonly smsProviderRepository: SmsProviderRepository,
    private readonly pushProviderRepository: PushProviderRepository,
    private readonly auditService: AuditService,
    private readonly metrics: NotificationMetricsService,
  ) {}

  recordAttempt(notificationId: string, channel: NotificationChannel, providerId?: string): Promise<NotificationDelivery> {
    return this.deliveryRepository.create({
      notificationId,
      channel,
      emailProviderId: channel === "EMAIL" ? providerId : undefined,
      smsProviderId: channel === "SMS" ? providerId : undefined,
      pushProviderId: channel === "PUSH" ? providerId : undefined,
    });
  }

  async recordSuccess(deliveryId: string, providerMessageId: string, ctx: AuditContext = {}): Promise<NotificationDelivery> {
    const updated = await this.deliveryRepository.updateStatus(deliveryId, "SENT", { providerMessageId });
    this.metrics.increment(`delivery.${updated.channel.toLowerCase()}.sent`);
    await this.auditService.log("notification.delivery.sent", {
      entityType: "NotificationDelivery",
      entityId: deliveryId,
      ...ctx,
    });
    return updated;
  }

  async recordFailure(deliveryId: string, reason: string, ctx: AuditContext = {}): Promise<NotificationDelivery> {
    await this.deliveryRepository.incrementAttempts(deliveryId);
    const updated = await this.deliveryRepository.updateStatus(deliveryId, "FAILED", { failureReason: reason });
    this.metrics.increment(`delivery.${updated.channel.toLowerCase()}.failed`);
    await this.auditService.log("notification.delivery.failed", {
      entityType: "NotificationDelivery",
      entityId: deliveryId,
      metadata: { reason },
      ...ctx,
    });
    return updated;
  }

  /**
   * Provider failover, per channel — every active provider configured
   * for this organization, default-first. Callers (EmailService et al.)
   * try each in order until one succeeds; this is a read-only query, the
   * retry loop itself lives in the channel-specific service. Returns
   * `string[]` (each channel's own provider-type enum as a plain string)
   * rather than any one channel's specific enum type, since Email/SMS/
   * Push each have a genuinely different type here — no shared enum
   * exists to return honestly. (An earlier draft of this method
   * mistakenly cast through Module 004's unrelated billing
   * `PaymentProviderType` as a placeholder; fixed before this shipped.)
   */
  async getFailoverOrder(organizationId: string, channel: NotificationChannel): Promise<string[]> {
    switch (channel) {
      case "EMAIL": {
        const rows = await this.emailProviderRepository.findByOrganization(organizationId);
        return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).map((r) => r.type);
      }
      case "SMS": {
        const rows = await this.smsProviderRepository.findByOrganization(organizationId);
        return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).map((r) => r.type);
      }
      case "PUSH": {
        const rows = await this.pushProviderRepository.findByOrganization(organizationId);
        return rows.sort((a, b) => Number(b.isDefault) - Number(a.isDefault)).map((r) => r.type);
      }
      default:
        return [];
    }
  }
}
