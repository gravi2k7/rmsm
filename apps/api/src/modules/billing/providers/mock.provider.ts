import { Inject, Injectable } from "@nestjs/common";
import { randomBytes, createHmac, timingSafeEqual } from "crypto";
import type { PaymentProviderType } from "@rmsm/database";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../config/app-config.module";
import {
  PaymentProviderAdapter,
  ProviderCustomer,
  ProviderSubscriptionResult,
  CreateSubscriptionInput,
  CheckoutSession,
  NormalizedWebhookEvent,
} from "../interfaces/payment-provider.interface";

/**
 * The one explicitly-allowed mock in this module ("no mock implementations
 * except payment provider abstraction" — the prompt's own words). Fully
 * deterministic and self-contained: no network calls, in-memory id
 * generation, a real (if simplified) HMAC webhook-signing scheme so local
 * development and tests can exercise the full webhook-verification code
 * path without needing a real provider account. Default provider
 * (PaymentProviderType.MOCK is OrganizationSubscription's schema default)
 * for local/dev environments.
 */
@Injectable()
export class MockProvider extends PaymentProviderAdapter {
  readonly provider: PaymentProviderType = "MOCK";
  /** Always enabled — MOCK never depends on external credentials. */
  readonly enabled = true;

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  async createCustomer(organizationId: string, _billingEmail: string): Promise<ProviderCustomer> {
    return { providerCustomerId: `mock_cus_${organizationId}_${randomBytes(4).toString("hex")}` };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscriptionResult> {
    const periodDays = input.billingCycle === "YEARLY" ? 365 : 30;
    return {
      providerSubscriptionId: `mock_sub_${randomBytes(8).toString("hex")}`,
      status: input.trialDays > 0 ? "trialing" : "active",
      currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
    };
  }

  async cancelSubscription(_providerSubscriptionId: string): Promise<void> {
    // No external state to update — MOCK subscriptions have no backing
    // resource beyond the OrganizationSubscription row SubscriptionService
    // already owns.
  }

  async createCheckoutSession(providerCustomerId: string, planProviderPriceId: string): Promise<CheckoutSession> {
    const sessionId = `mock_cs_${randomBytes(8).toString("hex")}`;
    return {
      providerSessionId: sessionId,
      url: `${this.config.WEB_APP_URL}/mock-checkout?session=${sessionId}&customer=${providerCustomerId}&price=${planProviderPriceId}`,
    };
  }

  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    const expected = createHmac("sha256", this.config.MOCK_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    const parsed = JSON.parse(rawBody) as {
      id: string;
      type: NormalizedWebhookEvent["type"];
      subscriptionId?: string;
      transactionId?: string;
      amountCents?: number;
      currency?: string;
    };
    return {
      provider: "MOCK",
      providerEventId: parsed.id,
      type: parsed.type,
      providerSubscriptionId: parsed.subscriptionId,
      providerTransactionId: parsed.transactionId,
      amountCents: parsed.amountCents,
      currency: parsed.currency,
      raw: parsed as unknown as Record<string, unknown>,
    };
  }
}
