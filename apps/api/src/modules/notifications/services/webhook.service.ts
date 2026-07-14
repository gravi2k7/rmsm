import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { NotificationWebhookRepository } from "../repositories/notification-webhook.repository";
import { CredentialEncryptionService } from "../providers/shared/credential-encryption";
import { assertSafeWebhookUrl } from "../providers/shared/ssrf-guard";

/**
 * Outbound event notifications to organization-configured endpoints
 * (spec: "Webhook callbacks") — distinct from inbound provider callbacks
 * (bounce/open/click), which arrive at WebhookController and are handled
 * by TrackingService, not this service. Fires HMAC-signed POST requests
 * using the same encryption approach as provider credentials
 * (CredentialEncryptionService, Phase 2b) for the stored signing secret.
 *
 * SSRF defense-in-depth (Phase 5 security review): the URL is already
 * checked once at subscription-creation time
 * (NotificationWebhookSubscriptionController), but checked again here,
 * immediately before every fetch — a domain that resolved safely at
 * registration time could resolve to a private address by the time it's
 * actually triggered (DNS rebinding). See ssrf-guard.ts's own comment for
 * what this does and doesn't fully protect against.
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
          await assertSafeWebhookUrl(webhook.url);

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
