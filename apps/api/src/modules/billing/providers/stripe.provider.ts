import { Inject, Injectable } from "@nestjs/common";
import { createHmac, timingSafeEqual } from "crypto";
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
 * Stripe, implemented against Stripe's REST API directly via `fetch` —
 * no `stripe` npm package dependency, matching this project's established
 * "no SDK coupling" approach (Module 002's Google/GitHub/Microsoft OAuth
 * providers use the exact same pattern). `enabled` mirrors
 * OAuthProviderStrategy's shape: disabled, not broken, when credentials
 * are absent.
 */
@Injectable()
export class StripeProvider extends PaymentProviderAdapter {
  readonly provider: PaymentProviderType = "STRIPE";

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.config.STRIPE_SECRET_KEY && this.config.STRIPE_WEBHOOK_SECRET);
  }

  private authHeader(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.STRIPE_SECRET_KEY ?? ""}`,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  async createCustomer(organizationId: string, billingEmail: string): Promise<ProviderCustomer> {
    const res = await fetch(`${this.config.STRIPE_API_BASE}/customers`, {
      method: "POST",
      headers: this.authHeader(),
      body: new URLSearchParams({ email: billingEmail, "metadata[organizationId]": organizationId }),
    });
    const data = (await res.json()) as { id: string; error?: { message: string } };
    if (!res.ok) throw new Error(`Stripe createCustomer failed: ${data.error?.message ?? res.statusText}`);
    return { providerCustomerId: data.id };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscriptionResult> {
    const body = new URLSearchParams({
      customer: input.providerCustomerId,
      "items[0][price]": input.planProviderPriceId,
    });
    if (input.trialDays > 0) body.set("trial_period_days", String(input.trialDays));

    const res = await fetch(`${this.config.STRIPE_API_BASE}/subscriptions`, {
      method: "POST",
      headers: this.authHeader(),
      body,
    });
    const data = (await res.json()) as {
      id: string;
      status: string;
      current_period_end: number;
      error?: { message: string };
    };
    if (!res.ok) throw new Error(`Stripe createSubscription failed: ${data.error?.message ?? res.statusText}`);

    return {
      providerSubscriptionId: data.id,
      status: data.status === "trialing" ? "trialing" : data.status === "active" ? "active" : "incomplete",
      currentPeriodEnd: new Date(data.current_period_end * 1000),
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const res = await fetch(`${this.config.STRIPE_API_BASE}/subscriptions/${providerSubscriptionId}`, {
      method: "DELETE",
      headers: this.authHeader(),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: { message: string } };
      throw new Error(`Stripe cancelSubscription failed: ${data.error?.message ?? res.statusText}`);
    }
  }

  async createCheckoutSession(providerCustomerId: string, planProviderPriceId: string): Promise<CheckoutSession> {
    const res = await fetch(`${this.config.STRIPE_API_BASE}/checkout/sessions`, {
      method: "POST",
      headers: this.authHeader(),
      body: new URLSearchParams({
        customer: providerCustomerId,
        mode: "subscription",
        "line_items[0][price]": planProviderPriceId,
        "line_items[0][quantity]": "1",
         success_url: `${this.config.WEB_APP_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${this.config.WEB_APP_URL}/billing/cancelled`,
      }),
    });
    const data = (await res.json()) as { id: string; url: string; error?: { message: string } };
    if (!res.ok) throw new Error(`Stripe createCheckoutSession failed: ${data.error?.message ?? res.statusText}`);
    return { providerSessionId: data.id, url: data.url };
  }

  /**
   * Stripe's documented scheme: the `Stripe-Signature` header is
   * `t=<timestamp>,v1=<hmac>` (and sometimes an old `v0=` for
   * transitional periods, ignored here). Verification is HMAC-SHA256 over
   * `${timestamp}.${rawBody}` using the webhook signing secret, compared
   * with a timing-safe equality check — implemented directly per Stripe's
   * public documentation, no SDK needed for this either.
   */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.config.STRIPE_WEBHOOK_SECRET) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(",").map((part) => {
        const [key, value] = part.split("=");
        return [key, value] as [string, string];
      }),
    );
    const timestamp = parts.t;
    const signature = parts.v1;
    if (!timestamp || !signature) return false;

    const expected = createHmac("sha256", this.config.STRIPE_WEBHOOK_SECRET)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signature, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    const event = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data: { object: Record<string, unknown> };
    };

    const typeMap: Record<string, NormalizedWebhookEvent["type"] | undefined> = {
      "payment_intent.succeeded": "payment.succeeded",
      "payment_intent.payment_failed": "payment.failed",
      "customer.subscription.updated": "subscription.updated",
      "customer.subscription.deleted": "subscription.cancelled",
      "invoice.paid": "invoice.paid",
    };
    const normalizedType = typeMap[event.type];
    if (!normalizedType) {
      throw new Error(`Unrecognized Stripe event type: ${event.type}`);
    }

    const obj = event.data.object as {
      id?: string;
      subscription?: string;
      amount?: number;
      amount_paid?: number;
      currency?: string;
    };

    return {
      provider: "STRIPE",
      providerEventId: event.id,
      type: normalizedType,
      providerSubscriptionId: typeof obj.subscription === "string" ? obj.subscription : undefined,
      providerTransactionId: obj.id,
      amountCents: obj.amount ?? obj.amount_paid,
      currency: obj.currency,
      raw: event.data.object,
    };
  }
}
