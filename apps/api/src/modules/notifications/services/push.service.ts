import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import { NotificationDelivery, PushProviderType } from "@rmsm/database";
import { PushProviderRegistry } from "../providers/push/push-provider.registry";
import { DeliveryService } from "./delivery.service";
import { DeviceTokenRepository } from "../repositories/device-token.repository";
import type { PushMessage } from "../interfaces/providers/push-provider.interface";

/** Same failover shape as EmailService/SmsService — see EmailService's class comment. */
@Injectable()
export class PushService {
  constructor(
    private readonly registry: PushProviderRegistry,
    private readonly deliveryService: DeliveryService,
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async send(organizationId: string, notificationId: string, message: PushMessage): Promise<NotificationDelivery> {
    const failoverOrder = await this.deliveryService.getFailoverOrder(organizationId, "PUSH");
    const typesToTry: PushProviderType[] =
      failoverOrder.length > 0 ? (failoverOrder as PushProviderType[]) : [(await this.registry.getDefault(organizationId)).type];

    let lastError: unknown;
    for (const type of typesToTry) {
      const delivery = await this.deliveryService.recordAttempt(notificationId, "PUSH");
      try {
        const adapter = await this.registry.get(organizationId, type);
        const result = await adapter.send(message);
        return await this.deliveryService.recordSuccess(delivery.id, result.providerMessageId);
      } catch (error) {
        lastError = error;
        const invalidToken = (error as { invalidToken?: { deviceToken: string } }).invalidToken;
        if (invalidToken) {
          // Deactivate the stale token so future sends don't repeat the
          // same failure — the specific reason PushInvalidTokenError
          // exists (Phase 1's interface comment).
          const tokenRow = await this.deviceTokenRepository.findByToken(invalidToken.deviceToken);
          if (tokenRow) await this.deviceTokenRepository.deactivate(tokenRow.id);
        }
        await this.deliveryService.recordFailure(delivery.id, error instanceof Error ? error.message : String(error));
      }
    }

    throw new ValidationError(
      `Push send failed on every configured provider for this organization: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }

  /** Fan-out to every active device a user has registered — the spec's per-user push send, not a single-device send. */
  async sendToUser(
    organizationId: string,
    notificationId: string,
    userId: string,
    message: Omit<PushMessage, "deviceToken" | "platform">,
  ): Promise<NotificationDelivery[]> {
    const tokens = await this.deviceTokenRepository.findActiveByUser(userId);
    return Promise.all(
      tokens.map((token) =>
        this.send(organizationId, notificationId, { ...message, deviceToken: token.token, platform: token.platform }),
      ),
    );
  }
}
