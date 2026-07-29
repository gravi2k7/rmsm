import { Controller, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import type { RawBodyRequest } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { ValidationError } from "@rmsm/shared";
import type { PaymentProviderType } from "@rmsm/database";
import { WebhookService } from "./services/webhook.service";
import { Public } from "../auth/decorators/public.decorator";

const VALID_PROVIDERS = new Set(["STRIPE", "MOCK", "RAZORPAY", "PADDLE", "LEMONSQUEEZY", "PAYPAL"]);

/**
 * Public — payment providers cannot present an RMSM JWT, so this is the
 * one billing endpoint outside the authenticated/authorized surface
 * everything else in this module uses. Security here comes entirely from
 * each provider's own signature scheme (verified inside WebhookService/
 * the relevant provider adapter), not from JWT auth.
 *
 * Requires `rawBody: true` in main.ts's NestFactory.create() (added this
 * phase) — every provider's signature verification needs the exact raw
 * request bytes, not NestJS's default JSON-parsed body, since re-
 * serializing a parsed object is not guaranteed to byte-for-byte match
 * what the provider actually signed.
 */
@ApiTags("Billing Webhooks")
@Controller("billing/webhooks")
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Post(":provider")
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: "provider", enum: Array.from(VALID_PROVIDERS) })
  @ApiOperation({ operationId: "handleProviderWebhook", summary: "Receive and process a payment provider webhook event." })
  async handle(
    @Param("provider") providerParam: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ status: string }> {
    const provider = providerParam.toUpperCase();
    if (!VALID_PROVIDERS.has(provider)) {
      throw new ValidationError(`Unknown payment provider "${providerParam}".`);
    }
    if (!req.rawBody) {
      throw new ValidationError("Raw request body was not captured — check main.ts's rawBody configuration.");
    }

    const rawBody = req.rawBody.toString("utf8");
    const signatureHeader = this.extractSignatureHeader(provider as PaymentProviderType, req);

    const result = await this.webhookService.handleWebhook(
      provider as PaymentProviderType,
      rawBody,
      signatureHeader,
    );
    return result;
  }

  /**
   * Stripe and Razorpay each sign with a single header value. PayPal's
   * verification (see PayPalProvider.verifyWebhookSignature) needs a
   * bundle of five separate headers — assembled here into the JSON string
   * that provider's adapter expects, exactly per PayPal's own
   * verify-webhook-signature API contract.
   */
  private extractSignatureHeader(provider: PaymentProviderType, req: Request): string {
    switch (provider) {
      case "STRIPE":
        return String(req.headers["stripe-signature"] ?? "");
      case "RAZORPAY":
        return String(req.headers["x-razorpay-signature"] ?? "");
      case "PAYPAL":
        return JSON.stringify({
          transmissionId: req.headers["paypal-transmission-id"],
          transmissionTime: req.headers["paypal-transmission-time"],
          certUrl: req.headers["paypal-cert-url"],
          authAlgo: req.headers["paypal-auth-algo"],
          transmissionSig: req.headers["paypal-transmission-sig"],
        });
      case "MOCK":
        return String(req.headers["x-mock-signature"] ?? "");
      default:
        return "";
    }
  }
}
