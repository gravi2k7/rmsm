import { Injectable, Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { InjectQueue } from "@nestjs/bullmq";
import type { Queue } from "bullmq";
import { NotificationWebhookRepository } from "../repositories/notification-webhook.repository";
import { CredentialEncryptionService } from "../providers/shared/credential-encryption";
import { assertSafeWebhookUrl } from "../providers/shared/ssrf-guard";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";

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
    private readonly eventPublisher: DomainEventPublisher,
    @InjectQueue("webhook") private readonly webhookRetryQueue: Queue,
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

          if (res.ok) {
            await this.webhookRepository.updateLastTriggered(webhook.id, "success");
            await this.eventPublisher.publish(MOD005_EVENTS.WEBHOOK_DELIVERED, {
              webhookId: webhook.id,
              organizationId,
              eventType,
            });
          } else {
            await this.webhookRepository.updateLastTriggered(webhook.id, `failed_${res.status}`);
            await this.publishFailureAndScheduleRetry(webhook.id, organizationId, eventType, payload, `HTTP ${res.status}`);
          }
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Outbound webhook ${webhook.id} failed: ${reason}`);
          await this.webhookRepository.updateLastTriggered(webhook.id, "failed_network_error");
          await this.publishFailureAndScheduleRetry(webhook.id, organizationId, eventType, payload, reason);
        }
      }),
    );
  }

  /** Called by WebhookRetryProcessor for each BullMQ retry attempt. */
  async retryDelivery(webhookId: string, eventType: string, payload: Record<string, unknown>): Promise<void> {
    const webhook = await this.webhookRepository.findById(webhookId);
    if (!webhook || !webhook.isActive) {
      this.logger.warn(`Webhook ${webhookId} retry skipped — webhook no longer exists or is inactive.`);
      return;
    }

    await assertSafeWebhookUrl(webhook.url);
    const body = JSON.stringify({ eventType, payload, timestamp: new Date().toISOString(), retry: true });
    const secret = this.encryption.decrypt<{ secret: string }>(webhook.secretEnc).secret;
    const signature = createHmac("sha256", secret).update(body).digest("hex");

    const res = await fetch(webhook.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-RMSM-Signature": signature },
      body,
    });

    if (res.ok) {
      await this.webhookRepository.updateLastTriggered(webhook.id, "success_after_retry");
      await this.eventPublisher.publish(MOD005_EVENTS.WEBHOOK_DELIVERED, {
        webhookId: webhook.id,
        organizationId: webhook.organizationId,
        eventType,
        retried: true,
      });
      return;
    }

    await this.webhookRepository.updateLastTriggered(webhook.id, `failed_retry_${res.status}`);
    throw new Error(`Webhook ${webhookId} retry failed with HTTP ${res.status} — BullMQ will retry per the job's own attempts/backoff.`);
  }

  /**
   * "Webhook Retries" (Domain 3) — publishes WebhookFailed, then enqueues
   * ONE retry attempt on a dedicated BullMQ queue with backoff, mirroring
   * the same "BullMQ handles retry/backoff, this class doesn't reimplement
   * it" division of responsibility EmailQueueProcessor's own doc comment
   * establishes. Previously (before this phase) a failed outbound webhook
   * was a dead end — `updateLastTriggered` recorded the failure and
   * nothing else happened. That silent-drop was the real, named gap this
   * closes.
   */
  private async publishFailureAndScheduleRetry(
    webhookId: string,
    organizationId: string,
    eventType: string,
    payload: Record<string, unknown>,
    reason: string,
  ): Promise<void> {
    await this.eventPublisher.publish(MOD005_EVENTS.WEBHOOK_FAILED, { webhookId, organizationId, eventType, reason });
    await this.webhookRetryQueue.add(
      "retry-webhook",
      { webhookId, organizationId, eventType, payload },
      { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    );
  }
}
