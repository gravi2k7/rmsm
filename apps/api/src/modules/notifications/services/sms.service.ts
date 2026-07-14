import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import { NotificationDelivery, SmsProviderType } from "@rmsm/database";
import { SmsProviderRegistry } from "../providers/sms/sms-provider.registry";
import { DeliveryService } from "./delivery.service";
import type { SmsMessage } from "../interfaces/providers/sms-provider.interface";

/** Same failover shape as EmailService — see that file's class comment. */
@Injectable()
export class SmsService {
  constructor(
    private readonly registry: SmsProviderRegistry,
    private readonly deliveryService: DeliveryService,
  ) {}

  async send(organizationId: string, notificationId: string, message: SmsMessage): Promise<NotificationDelivery> {
    const failoverOrder = await this.deliveryService.getFailoverOrder(organizationId, "SMS");
    const typesToTry: SmsProviderType[] =
      failoverOrder.length > 0 ? (failoverOrder as SmsProviderType[]) : [(await this.registry.getDefault(organizationId)).type];

    let lastError: unknown;
    for (const type of typesToTry) {
      const delivery = await this.deliveryService.recordAttempt(notificationId, "SMS");
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
      `SMS send failed on every configured provider for this organization: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }
}
