import { Injectable, Logger } from "@nestjs/common";
import { PaymentProviderType } from "@rmsm/database";
import { NotFoundError, ValidationError } from "@rmsm/shared";
import { AuditService } from "../../auth/services/audit.service";
import { PaymentWebhookRepository } from "../repositories/payment-webhook.repository";
import { OrganizationSubscriptionRepository } from "../repositories/organization-subscription.repository";
import { PaymentProviderRegistry } from "../providers/payment-provider.registry";
import { PaymentService } from "./payment.service";
import { SubscriptionService } from "./subscription.service";
import type { NormalizedWebhookEvent } from "../interfaces/payment-provider.interface";

/**
 * The single entry point for every provider webhook. Verifies the
 * signature (provider-specific — see each adapter), checks idempotency
 * (ADR-015: unique providerEventId), resolves which organization the
 * event belongs to (via the provider's own subscription id — providers
 * never send RMSM's internal organizationId), and dispatches to the
 * service that owns the affected resource.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly webhookRepository: PaymentWebhookRepository,
    private readonly subscriptionRepository: OrganizationSubscriptionRepository,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly paymentService: PaymentService,
    private readonly subscriptionService: SubscriptionService,
    private readonly auditService: AuditService,
  ) {}

  async handleWebhook(
    provider: PaymentProviderType,
    rawBody: string,
    signatureHeader: string,
  ): Promise<{ status: "processed" | "duplicate" }> {
    const adapter = this.providerRegistry.get(provider);

    const verified = await adapter.verifyWebhookSignature(rawBody, signatureHeader);
    if (!verified) {
      throw new ValidationError("Webhook signature verification failed.");
    }

    const event = adapter.parseWebhookEvent(rawBody);

    const existing = await this.webhookRepository.findByProviderEventId(event.providerEventId);
    if (existing) {
      this.logger.log(`Duplicate webhook delivery ignored: ${provider}/${event.providerEventId}`);
      return { status: "duplicate" };
    }

    const webhookRecord = await this.webhookRepository.create({
      provider,
      eventType: event.type,
      providerEventId: event.providerEventId,
      payload: event.raw,
    });

    try {
      await this.dispatch(event);
      await this.webhookRepository.markProcessed(webhookRecord.id);
    } catch (error) {
      await this.webhookRepository.markFailed(webhookRecord.id);
      await this.auditService.log("billing.webhook.processing_failed", {
        entityType: "PaymentWebhook",
        entityId: webhookRecord.id,
        metadata: { provider, eventType: event.type, error: error instanceof Error ? error.message : String(error) },
      });
      throw error;
    }

    await this.auditService.log("billing.webhook.processed", {
      entityType: "PaymentWebhook",
      entityId: webhookRecord.id,
      metadata: { provider, eventType: event.type },
    });

    return { status: "processed" };
  }

  private async dispatch(event: NormalizedWebhookEvent): Promise<void> {
    switch (event.type) {
      case "payment.succeeded":
      case "payment.failed": {
        if (!event.providerTransactionId || event.amountCents === undefined) {
          throw new ValidationError(
            `${event.type} event ${event.providerEventId} is missing a transaction id or amount — cannot record.`,
          );
        }
        const organizationId = await this.resolveOrganizationId(event);
        await this.paymentService.recordPayment({
          organizationId,
          provider: event.provider,
          providerTransactionId: event.providerTransactionId,
          amountCents: event.amountCents,
          currency: event.currency,
          status: event.type === "payment.succeeded" ? "SUCCESS" : "FAILED",
        });
        return;
      }

      case "invoice.paid": {
        const organizationId = await this.resolveOrganizationId(event);
        await this.subscriptionService.syncStatusFromProvider(organizationId, "ACTIVE", undefined);
        return;
      }

      case "subscription.updated": {
        const organizationId = await this.resolveOrganizationId(event);
        // Provider payloads for this event type generally include the
        // renewed period end, but NormalizedWebhookEvent doesn't currently
        // carry it (only amount/currency/transaction fields, which don't
        // apply to a pure status-update event). Status-only sync for now;
        // extending NormalizedWebhookEvent with a periodEnd field is a
        // clean, additive follow-up once a real provider sandbox is
        // available to confirm the field is actually populated
        // consistently across all three real providers.
        await this.subscriptionService.syncStatusFromProvider(organizationId, "ACTIVE", undefined);
        return;
      }

      case "subscription.cancelled": {
        const organizationId = await this.resolveOrganizationId(event);
        await this.subscriptionService.cancelSubscription(organizationId, null);
        return;
      }
    }
  }

  private async resolveOrganizationId(event: NormalizedWebhookEvent): Promise<string> {
    if (!event.providerSubscriptionId) {
      throw new ValidationError(
        `Event ${event.providerEventId} has no provider subscription id — cannot resolve which organization it belongs to.`,
      );
    }
    const subscription = await this.subscriptionRepository.findByProviderSubscriptionId(
      event.providerSubscriptionId,
    );
    if (!subscription) {
      throw new NotFoundError("OrganizationSubscription (by provider subscription id)", event.providerSubscriptionId);
    }
    return subscription.organizationId;
  }
}
