import type { BillingCycle, PaymentProviderType } from "@rmsm/database";

/**
 * The provider abstraction the entire billing module is built against.
 * No service, controller, or DTO in this module imports a provider SDK
 * directly — everything talks to this interface. Adding Razorpay/Paddle/
 * LemonSqueezy later (all named in the spec's "Future" list) means writing
 * one class implementing this interface and registering it in
 * PaymentProviderRegistry (Phase 3) — the same registry pattern already
 * proven in Module 002's OAuth provider abstraction
 * (apps/api/src/modules/oauth/oauth-provider.registry.ts). This interface
 * is intentionally shaped after that one.
 */

export interface ProviderCustomer {
  providerCustomerId: string;
}

export interface ProviderSubscriptionResult {
  providerSubscriptionId: string;
  status: "active" | "trialing" | "incomplete";
  currentPeriodEnd: Date;
}

export interface CreateSubscriptionInput {
  providerCustomerId: string;
  planProviderPriceId: string;
  billingCycle: BillingCycle;
  trialDays: number;
}

export interface CheckoutSession {
  url: string;
  providerSessionId: string;
}

/**
 * A provider-agnostic representation of a webhook event, after signature
 * verification and provider-specific payload parsing. WebhookService
 * (Phase 3) only ever handles this shape — it never sees a raw Stripe (or
 * any other provider's) event object.
 */
export interface NormalizedWebhookEvent {
  provider: PaymentProviderType;
  providerEventId: string;
  type:
    | "payment.succeeded"
    | "payment.failed"
    | "subscription.updated"
    | "subscription.cancelled"
    | "invoice.paid";
  providerSubscriptionId?: string;
  providerTransactionId?: string;
  amountCents?: number;
  currency?: string;
  raw: Record<string, unknown>;
}

export abstract class PaymentProviderAdapter {
  abstract readonly provider: PaymentProviderType;

  abstract createCustomer(organizationId: string, billingEmail: string): Promise<ProviderCustomer>;

  abstract createSubscription(input: CreateSubscriptionInput): Promise<ProviderSubscriptionResult>;

  abstract cancelSubscription(providerSubscriptionId: string): Promise<void>;

  abstract createCheckoutSession(
    providerCustomerId: string,
    planProviderPriceId: string,
  ): Promise<CheckoutSession>;

  /** Verifies a webhook payload's signature using the provider's own scheme. Returns false rather than throwing on failure — callers decide how to respond. */
  abstract verifyWebhookSignature(rawBody: string, signatureHeader: string): boolean;

  /** Parses an already-verified webhook payload into the normalized shape every provider produces. */
  abstract parseWebhookEvent(rawBody: string): NormalizedWebhookEvent;
}
