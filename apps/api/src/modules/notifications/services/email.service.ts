import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import { NotificationDelivery, EmailProviderType } from "@rmsm/database";
import { EmailProviderRegistry } from "../providers/email/email-provider.registry";
import { DeliveryService } from "./delivery.service";
import type { EmailMessage } from "../interfaces/providers/email-provider.interface";

/**
 * Dispatches via the organization's configured (or platform-default)
 * email provider, with failover: if the primary provider's send throws,
 * tries the next active provider for this organization before giving up
 * — the spec's "Provider failover" requirement, implemented here rather
 * than in DeliveryService (which only reports the failover *order*, not
 * the retry loop itself — see that file's comment).
 */
@Injectable()
export class EmailService {
  constructor(
    private readonly registry: EmailProviderRegistry,
    private readonly deliveryService: DeliveryService,
  ) {}

  async send(organizationId: string, notificationId: string, message: EmailMessage): Promise<NotificationDelivery> {
    const failoverOrder = await this.deliveryService.getFailoverOrder(organizationId, "EMAIL");
    const orderedTypes = failoverOrder.length > 0 ? (failoverOrder as EmailProviderType[]) : undefined;

    let lastError: unknown;
    const typesToTry = orderedTypes ?? [(await this.registry.getDefault(organizationId)).type];

    for (const type of typesToTry) {
      const delivery = await this.deliveryService.recordAttempt(notificationId, "EMAIL");
      try {
        const adapter = await this.registry.get(organizationId, type);
        const result = await adapter.send(message);
        return this.deliveryService.recordSuccess(delivery.id, result.providerMessageId);
      } catch (error) {
        lastError = error;
        await this.deliveryService.recordFailure(delivery.id, error instanceof Error ? error.message : String(error));
      }
    }

    throw new ValidationError(
      `Email send failed on every configured provider for this organization: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }
}
