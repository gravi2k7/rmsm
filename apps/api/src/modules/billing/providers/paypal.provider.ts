import { Inject, Injectable } from "@nestjs/common";
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
 * PayPal, implemented against its REST API v2 directly via `fetch` — same
 * "no SDK" approach as the other providers. Two real API-shape
 * differences, documented rather than silently smoothed over:
 *
 * 1. PayPal has no standalone "create a customer" endpoint the way
 *    Stripe/Razorpay do — payer information is supplied at subscription-
 *    creation time instead. `createCustomer` here stores nothing on
 *    PayPal's side and returns a locally-generated reference id purely so
 *    this adapter satisfies the same interface shape as the others;
 *    BillingService (a later phase) should not assume this id round-trips
 *    through any PayPal API call the way a Stripe customer id would.
 * 2. `verifyWebhookSignature` is a required server-to-server call to
 *    PayPal's own verification endpoint (certificate-based signing) — this
 *    is *why* the interface was amended to `Promise<boolean>` this phase.
 *    There is no local-HMAC shortcut available for PayPal the way there is
 *    for Stripe/Razorpay.
 */
@Injectable()
export class PayPalProvider extends PaymentProviderAdapter {
  readonly provider: PaymentProviderType = "PAYPAL";

  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.config.PAYPAL_CLIENT_ID && this.config.PAYPAL_CLIENT_SECRET);
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.value;
    }

    const credentials = Buffer.from(`${this.config.PAYPAL_CLIENT_ID ?? ""}:${this.config.PAYPAL_CLIENT_SECRET ?? ""}`).toString(
      "base64",
    );
    const res = await fetch(`${this.config.PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    const data = (await res.json()) as { access_token: string; expires_in: number; error?: string };
    if (!res.ok) throw new Error(`PayPal OAuth token request failed: ${data.error ?? res.statusText}`);

    // Refresh 60s before actual expiry to avoid a request racing an
    // about-to-expire token.
    this.cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
    return data.access_token;
  }

  private async authHeader(): Promise<Record<string, string>> {
    const token = await this.getAccessToken();
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  }

  async createCustomer(organizationId: string, _billingEmail: string): Promise<ProviderCustomer> {
    // See class comment #1 — no real PayPal-side resource is created here.
    return { providerCustomerId: `paypal_local_${organizationId}` };
  }

  async createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscriptionResult> {
    const headers = await this.authHeader();
    const res = await fetch(`${this.config.PAYPAL_API_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers,
      body: JSON.stringify({ plan_id: input.planProviderPriceId }),
    });
    const data = (await res.json()) as { id: string; status: string; error_description?: string };
    if (!res.ok) throw new Error(`PayPal createSubscription failed: ${data.error_description ?? res.statusText}`);

    return {
      providerSubscriptionId: data.id,
      status: data.status === "ACTIVE" ? "active" : data.status === "APPROVAL_PENDING" ? "incomplete" : "incomplete",
      // PayPal doesn't return a period-end on subscription creation the
      // way Stripe/Razorpay do — it's only available once the first
      // billing cycle completes. Approximated here from the requested
      // cycle; SubscriptionService (Phase 3+) should treat this as
      // provisional and reconcile from the subscription.updated webhook.
      currentPeriodEnd: new Date(Date.now() + (input.billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000),
    };
  }

  async cancelSubscription(providerSubscriptionId: string): Promise<void> {
    const headers = await this.authHeader();
    const res = await fetch(`${this.config.PAYPAL_API_BASE}/v1/billing/subscriptions/${providerSubscriptionId}/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({ reason: "Customer requested cancellation" }),
    });
    if (!res.ok && res.status !== 204) {
      const data = (await res.json()) as { error_description?: string };
      throw new Error(`PayPal cancelSubscription failed: ${data.error_description ?? res.statusText}`);
    }
  }

  /** Uses the Orders v2 API to produce a redirectable approval link — the closest PayPal equivalent to a Stripe Checkout Session (see class comment). */
  async createCheckoutSession(_providerCustomerId: string, planProviderPriceId: string): Promise<CheckoutSession> {
    const headers = await this.authHeader();
    const res = await fetch(`${this.config.PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{ reference_id: planProviderPriceId }],
      }),
    });
    const data = (await res.json()) as {
      id: string;
      links: { rel: string; href: string }[];
      error_description?: string;
    };
    if (!res.ok) throw new Error(`PayPal createCheckoutSession failed: ${data.error_description ?? res.statusText}`);

    const approveLink = data.links.find((l) => l.rel === "approve");
    if (!approveLink) throw new Error("PayPal createCheckoutSession: no approve link in response");

    return { providerSessionId: data.id, url: approveLink.href };
  }

  /**
   * PayPal's required verification path — a server-to-server call to
   * `/v1/notifications/verify-webhook-signature`, not a local HMAC
   * comparison. This is the concrete reason the interface's
   * `verifyWebhookSignature` was amended to `Promise<boolean>` this
   * phase. `signatureHeader` here is expected to be a JSON-encoded bundle
   * of the several PayPal-specific headers this endpoint requires
   * (transmission id/time/sig, cert url, auth algo) — WebhookService
   * (a later phase) is responsible for assembling that bundle from the
   * raw request headers before calling this method.
   */
  async verifyWebhookSignature(rawBody: string, signatureHeader: string): Promise<boolean> {
    if (!this.config.PAYPAL_WEBHOOK_ID) return false;

    let headers: {
      transmissionId: string;
      transmissionTime: string;
      certUrl: string;
      authAlgo: string;
      transmissionSig: string;
    };
    try {
      headers = JSON.parse(signatureHeader);
    } catch {
      return false;
    }

    const authHeader = await this.authHeader();
    const res = await fetch(`${this.config.PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: authHeader,
      body: JSON.stringify({
        transmission_id: headers.transmissionId,
        transmission_time: headers.transmissionTime,
        cert_url: headers.certUrl,
        auth_algo: headers.authAlgo,
        transmission_sig: headers.transmissionSig,
        webhook_id: this.config.PAYPAL_WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { verification_status: string };
    return data.verification_status === "SUCCESS";
  }

  parseWebhookEvent(rawBody: string): NormalizedWebhookEvent {
    const event = JSON.parse(rawBody) as {
      id: string;
      event_type: string;
      resource: {
        id?: string;
        billing_agreement_id?: string;
        amount?: { total?: string; value?: string; currency?: string; currency_code?: string };
      };
    };

    const typeMap: Record<string, NormalizedWebhookEvent["type"] | undefined> = {
      "PAYMENT.SALE.COMPLETED": "payment.succeeded",
      "PAYMENT.SALE.DENIED": "payment.failed",
      "BILLING.SUBSCRIPTION.UPDATED": "subscription.updated",
      "BILLING.SUBSCRIPTION.CANCELLED": "subscription.cancelled",
      "PAYMENT.SALE.REFUNDED": "payment.failed",
    };
    const normalizedType = typeMap[event.event_type];
    if (!normalizedType) {
      throw new Error(`Unrecognized PayPal event type: ${event.event_type}`);
    }

    const amountValue = event.resource.amount?.total ?? event.resource.amount?.value;
    const currency = event.resource.amount?.currency ?? event.resource.amount?.currency_code;

    return {
      provider: "PAYPAL",
      providerEventId: event.id,
      type: normalizedType,
      providerSubscriptionId: event.resource.billing_agreement_id,
      providerTransactionId: event.resource.id,
      amountCents: amountValue ? Math.round(Number(amountValue) * 100) : undefined,
      currency,
      raw: event.resource as unknown as Record<string, unknown>,
    };
  }
}
