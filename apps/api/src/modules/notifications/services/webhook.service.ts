import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { NotificationWebhookRepository } from "../repositories/notification-webhook.repository";
import { CredentialEncryptionService } from "../providers/shared/credential-encryption";

/**
 * Outbound event notifications to organization-configured endpoints
 * (spec: "Webhook callbacks") — distinct from inbound provider callbacks
 * (bounce/open/click), which arrive at a future WebhookController and are
 * handled by TrackingService, not this service. Fires HMAC-signed POST
 * requests using the same encryption approach as provider credentials
 * (CredentialEncryptionService, Phase 2b) for the stored signing secret.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly webhookRepository: NotificationWebhookRepository,
    private readonly encryption: CredentialEncryptionService,
  ) {}

  async triggerForEvent(organizationId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await this.webhookRepository.findActiveByOrganization(organizationId, eventType);

    await Promise.all(
      webhooks.map(async (webhook) => {
        try {
          const body = JSON.stringify({ eventType, payload, timestamp: new Date().toISOString() });
          const secret = this.encryption.decrypt<{ secret: string }>(webhook.secretEnc).secret;
          const signature = createHmac("sha256", secret).update(body).digest("hex");

          const res = await fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-RMSM-Signature": signature },
            body,
          });

          await this.webhookRepository.updateLastTriggered(webhook.id, res.ok ? "success" : `failed_${res.status}`);
        } catch (error) {
          this.logger.warn(`Outbound webhook ${webhook.id} failed: ${error instanceof Error ? error.message : String(error)}`);
          await this.webhookRepository.updateLastTriggered(webhook.id, "failed_network_error");
        }
      }),
    );
  }
}
