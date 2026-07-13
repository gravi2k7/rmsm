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
 * Razorpay, implemented against its REST API directly via `fetch` — same
 * "no SDK" approach as Stripe. One real API-shape difference worth noting:
 * Razorpay has no Stripe-style hosted "Checkout Session" endpoint for
 * subscriptions — `createCheckoutSession` here uses Razorpay's Payment
 * Links API (`POST /payment_links`), which is the closest equivalent
 * (returns a `short_url` a customer can be redirected to), not a literal
 * 1:1 mapping of Stripe's concept. Documented here rather than silently
 * treating the two as identical.
 */
@Injectable()
export class RazorpayProvider extends PaymentProviderAdapter {
  readonly provider: PaymentProviderType = "RAZORPAY";

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.config.RAZORPAY_KEY_ID && this.config.RAZORPAY_KEY_SECRET);
  }

  private authHeader(): Record<string, string> {
    const credentials = Buffer.from(`${this.config.RAZORPAY_KEY_ID ?? ""}:${this.config.RAZORPAY_KEY_SECRET ?? ""}`).toString(
      "base64",
    );
    return { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" };
  }

  async createCustomer(organizationId: string, billingEmail: string): Promise<ProviderCustomer> {
    const res = await fetch(`${this.config.RAZORPAY_API_BASE}/customers`, {
      method: "POST",
      headers: this.authHeader(),
      body: JSON.stringify({ email: billingEmail, notes: { organizationId } }),
    });
    const data = (await res.json()) as { id: string; error?: { description: string } };
    if (!res.ok) throw new Error(`Razorpay createCustomer failed: ${data.error?.description ?? res.statusText}`);
    return { providerCustomerId: data.id };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscriptionResult> {
    const res = await fetch(`${this.config.RAZORPAY_API_BASE}/subscriptions`, {
      method: "POST",
      headers: this.authHeader(),
      body: JSON.stringify({
        plan_id: input.planProviderPriceId,
        customer_notify: 1,
        total_count: input.billingCycle === "YEARLY" ? 1 : 12,
      }),
    });
    const data = (await res.json()) as {
      id: string;
      status: string;
      current_end: number;
      error?: { description: string };
    };
    if (!res.ok) throw new Error(`Razorpay createSubscription failed: ${data.error?.description ?? res.statusText}`);

    return {
      providerSubscriptionId: data.id,
      status: data.status === "authenticated" || data.status === "active" ? "active" : "incomplete",
      currentPeriodEnd: new Date(data.current_end * 1000),
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const res = await fetch(`${this.config.RAZORPAY_API_BASE}/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      headers: this.authHeader(),
      body: JSON.stringify({ cancel_at_cycle_end: 0 }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: { description: string } };
      throw new Error(`Razorpay cancelSubscription failed: ${data.error?.description ?? res.statusText}`);
    }
  }

  async createCheckoutSession(providerCustomerId: string, planProviderPriceId: string): Promise<CheckoutSession> {
    const res = await fetch(`${this.config.RAZORPAY_API_BASE}/payment_links`, {
      method: "POST",
      headers: this.authHeader(),
      body: JSON.stringify({
        customer: { id: providerCustomerId },
        reference_id: planProviderPriceId,
        notify: { sms: false, email: true },
      }),
    });
    const data = (await res.json()) as { id: string; short_url: string; error?: { description: string } };
    if (!res.ok) throw new Error(`Razorpay createCheckoutSession failed: ${data.error?.description ?? res.statusText}`);
    return { providerSessionId: data.id, url: data.short_url };
  }

  /**
   * Razorpay's documented scheme: HMAC-SHA256 of the raw request body
   * using the webhook secret, compared against the `X-Razorpay-Signature`
   * header — structurally the same approach as Stripe's, different header
   * shape (no timestamp component in Razorpay's version).
   */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.config.RAZORPAY_WEBHOOK_SECRET) return false;

    const expected = createHmac("sha256", this.config.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest("hex");
    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(signatureHeader, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    const event = JSON.parse(rawBody) as {
      id?: string;
      event: string;
      payload: {
        payment?: { entity: { id: string; amount: number; currency: string } };
        subscription?: { entity: { id: string } };
      };
      created_at: number;
    };

    const typeMap: Record<string, NormalizedWebhookEvent["type"] | undefined> = {
      "payment.captured": "payment.succeeded",
      "payment.failed": "payment.failed",
      "subscription.charged": "invoice.paid",
      "subscription.updated": "subscription.updated",
      "subscription.cancelled": "subscription.cancelled",
    };
    const normalizedType = typeMap[event.event];
    if (!normalizedType) {
      throw new Error(`Unrecognized Razorpay event type: ${event.event}`);
    }

    // Razorpay webhook payloads don't carry a single top-level event id
    // the way Stripe/PayPal do — synthesize a stable one from the
    // resource id + event type + timestamp for idempotency-key purposes.
    const resourceId = event.payload.payment?.entity.id ?? event.payload.subscription?.entity.id ?? "unknown";
    const providerEventId = event.id ?? `${event.event}_${resourceId}_${event.created_at}`;

    return {
      provider: "RAZORPAY",
      providerEventId,
      type: normalizedType,
      providerSubscriptionId: event.payload.subscription?.entity.id,
      providerTransactionId: event.payload.payment?.entity.id,
      amountCents: event.payload.payment?.entity.amount,
      currency: event.payload.payment?.entity.currency,
      raw: event.payload as unknown as Record<string, unknown>,
    };
  }
}
