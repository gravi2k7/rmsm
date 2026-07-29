import { Controller, Param, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ValidationError } from "@rmsm/shared";
import type { EmailProviderType, SmsProviderType } from "@rmsm/database";
import { EmailProviderRegistry } from "./providers/email/email-provider.registry";
import { SmsProviderRegistry } from "./providers/sms/sms-provider.registry";
import type { EmailProviderAdapter } from "./interfaces/providers/email-provider.interface";
import type { SmsProviderAdapter } from "./interfaces/providers/sms-provider.interface";
import { TrackingService } from "./services/tracking.service";
import { NotificationDeliveryRepository } from "./repositories/notification-delivery.repository";
import { Public } from "../auth/decorators/public.decorator";

/** A permissive common shape covering what this controller actually needs from either adapter family — avoids TypeScript's "not callable" error a union of two methods with incompatible literal return types would otherwise trigger. `eventType` is intentionally widened to `string`; the switch below only needs string equality, not each provider's narrower literal union. */
interface WebhookCapableAdapter {
  verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean>;
  parseWebhookEvent(rawBody: string): {
    providerMessageId: string;
    eventType: string;
    occurredAt: Date;
    raw: Record<string, unknown>;
  };
}

/**
 * INBOUND provider callbacks (bounce/open/click/delivered) — distinct
 * from Phase 2c's WebhookService, which fires OUTBOUND, org-configured
 * webhooks. Public (providers can't present an RMSM JWT), same reasoning
 * as Module 004's billing WebhookController.
 *
 * Route includes `:organizationId` explicitly — a real, necessary design
 * decision, not decoration: verifying a webhook's signature requires the
 * correct provider adapter with the correct organization's decrypted
 * credentials, and there's no way to know which organization a webhook
 * belongs to before parsing (and trusting) its payload. Each
 * organization that configures its own provider credentials must
 * therefore register a per-organization webhook URL with that provider
 * (e.g. `.../webhooks/sendgrid/organizations/<orgId>`), not a single
 * shared platform URL — the platform-default-provider case
 * (organizationId omitted upstream) is not handled by this route; only
 * organization-scoped provider configs are, since platform-wide webhook
 * routing raises the same ambiguity this route exists to resolve and
 * wasn't solved this phase (flagged, not silently ignored).
 */
@ApiTags("Notification Webhooks (Inbound)")
@Controller("notifications/webhooks")
export class WebhookController {
  constructor(
    private readonly emailRegistry: EmailProviderRegistry,
    private readonly smsRegistry: SmsProviderRegistry,
    private readonly trackingService: TrackingService,
    private readonly deliveryRepository: NotificationDeliveryRepository,
  ) {}

  @Public()
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  @Post(":provider/organizations/:organizationId")
  @ApiParam({ name: "provider", enum: ["sendgrid", "mailgun", "resend", "ses", "twilio", "messagebird", "vonage", "aws_sns"] })
  @ApiOperation({ operationId: "handleInboundProviderWebhook", summary: "Receive and process an inbound provider delivery/bounce/open/click event." })
  async handle(
    @Param("provider") providerParam: string,
    @Param("organizationId") organizationId: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    if (!req.rawBody) {
      throw new ValidationError("Raw request body was not captured — check main.ts's rawBody configuration.");
    }
    const rawBody = req.rawBody.toString("utf8");
    const provider = providerParam.toUpperCase();

    const { adapter, signatureHeader } = await this.resolveAdapterAndSignature(provider, organizationId, req);

    const verified = await adapter.verifyWebhookSignature(rawBody, signatureHeader);
    if (!verified) throw new ValidationError("Webhook signature verification failed.");

    const event = adapter.parseWebhookEvent(rawBody);
    const delivery = await this.deliveryRepository.findByProviderMessageId(event.providerMessageId);
    if (!delivery) {
      // A webhook for a message this system never sent (or already
      // purged) — acknowledged, not an error, since providers retry on
      // non-2xx responses and there's nothing to retry into existing.
      return { status: "unmatched" };
    }

    switch (event.eventType) {
      case "opened":
        await this.trackingService.recordOpen(delivery.id);
        break;
      case "clicked":
        await this.trackingService.recordClick(delivery.id, (event.raw.url as string) ?? "");
        break;
      case "bounced":
      case "complained":
        await this.trackingService.recordBounce(delivery.id, event.eventType, event.eventType === "bounced");
        break;
      case "delivered":
      case "failed":
        // Delivery-confirmed / failed states already have a direct
        // NotificationDelivery.status transition via DeliveryService at
        // send time — no additional TrackingService action needed for
        // these two event types today.
        break;
    }

    return { status: "processed" };
  }

  private async resolveAdapterAndSignature(
    provider: string,
    organizationId: string,
    req: Request,
  ): Promise<{ adapter: WebhookCapableAdapter; signatureHeader: string }> {
    const emailProviders: EmailProviderType[] = ["SENDGRID", "MAILGUN", "RESEND", "SES"];
    const smsProviders: SmsProviderType[] = ["TWILIO", "MESSAGEBIRD", "VONAGE", "AWS_SNS"];

    if (emailProviders.includes(provider as EmailProviderType)) {
      const adapter: EmailProviderAdapter = await this.emailRegistry.get(organizationId, provider as EmailProviderType);
      return { adapter, signatureHeader: this.extractSignatureHeader(provider, req) };
    }
    if (smsProviders.includes(provider as SmsProviderType)) {
      const adapter: SmsProviderAdapter = await this.smsRegistry.get(organizationId, provider as SmsProviderType);
      return { adapter, signatureHeader: this.extractSignatureHeader(provider, req) };
    }
    throw new ValidationError(`Unknown or unsupported inbound webhook provider "${provider}".`);
  }

  private extractSignatureHeader(provider: string, req: Request): string {
    switch (provider) {
      case "SENDGRID":
        return String(req.headers["x-twilio-email-event-webhook-signature"] ?? "");
      case "MAILGUN":
        return JSON.stringify({
          timestamp: req.body?.timestamp,
          token: req.body?.token,
          signature: req.body?.signature,
        });
      case "RESEND":
        return JSON.stringify({
          svixId: req.headers["svix-id"],
          svixTimestamp: req.headers["svix-timestamp"],
          svixSignature: req.headers["svix-signature"],
        });
      case "TWILIO":
        return JSON.stringify({
          url: `${req.protocol}://${req.get("host")}${req.originalUrl}`,
          params: req.body,
          signature: req.headers["x-twilio-signature"],
        });
      case "MESSAGEBIRD":
        return String(req.headers["messagebird-signature"] ?? "");
      case "VONAGE":
        return JSON.stringify({ params: req.query, signature: req.headers["x-vonage-signature"] });
      default:
        return String(req.headers["x-signature"] ?? "");
    }
  }
}
