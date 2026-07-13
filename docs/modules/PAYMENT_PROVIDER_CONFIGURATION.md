# Payment Provider Configuration

Every provider is disabled until its required environment variables are set —
`PaymentProviderRegistry.get()` throws a clear error naming the unconfigured provider rather
than silently falling back to something else. `MOCK` is the only provider that's always
enabled (see `packages/config/src/env.schema.ts` for the exact keys and defaults).

## Mock (default — local development & testing)

No external account needed. Used automatically when no `provider` is specified on subscription
creation.

```bash
MOCK_WEBHOOK_SECRET=<any string — defaults to a dev-only placeholder if unset>
```

To simulate a webhook locally, sign the JSON body with HMAC-SHA256 using
`MOCK_WEBHOOK_SECRET` and send it as the `x-mock-signature` header to
`POST /billing/webhooks/mock`. See `apps/api/test/billing-webhook.e2e-spec.ts` for a complete,
working example of constructing a valid signed payload.

## Stripe

```bash
STRIPE_SECRET_KEY=sk_test_...          # from the Stripe Dashboard → Developers → API keys
STRIPE_WEBHOOK_SECRET=whsec_...        # from Dashboard → Developers → Webhooks → your endpoint
STRIPE_API_BASE=https://api.stripe.com/v1   # rarely needs changing
```

**Webhook setup**: in the Stripe Dashboard, add an endpoint pointing to
`https://<your-domain>/api/v1/billing/webhooks/stripe`, subscribed to at minimum:
`payment_intent.succeeded`, `payment_intent.payment_failed`,
`customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`. Copy the
signing secret shown after creation into `STRIPE_WEBHOOK_SECRET`.

**Price IDs**: `SubscriptionService.createSubscription()` currently derives a provider price
id as `{planKey}_monthly` / `{planKey}_yearly` (e.g. `professional_monthly`) — these must exist
as actual Stripe Price objects with matching lookup keys before going live with Stripe. This is
a real, named integration step, not automated by this module.

## Razorpay

```bash
RAZORPAY_KEY_ID=rzp_test_...           # from Razorpay Dashboard → Settings → API Keys
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...            # from Dashboard → Settings → Webhooks → your endpoint
RAZORPAY_API_BASE=https://api.razorpay.com/v1
```

**Webhook setup**: in the Razorpay Dashboard, add a webhook pointing to
`https://<your-domain>/api/v1/billing/webhooks/razorpay`, subscribed to at minimum:
`payment.captured`, `payment.failed`, `subscription.charged`, `subscription.updated`,
`subscription.cancelled`.

**Checkout equivalent**: Razorpay has no Stripe-style hosted Checkout Session for
subscriptions — this module's `createCheckoutSession()` uses Razorpay's Payment Links API
instead (see `RazorpayProvider`'s class comment). Confirm this matches your actual product flow
before relying on it for a real checkout UI.

## PayPal

```bash
PAYPAL_CLIENT_ID=...                   # from PayPal Developer Dashboard → My Apps & Credentials
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...                  # from Dashboard → your app → Webhooks → your endpoint's Webhook ID
PAYPAL_API_BASE=https://api-m.sandbox.paypal.com   # switch to https://api-m.paypal.com for live
```

**Webhook setup**: in the PayPal Developer Dashboard, add a webhook pointing to
`https://<your-domain>/api/v1/billing/webhooks/paypal`, subscribed to at minimum:
`PAYMENT.SALE.COMPLETED`, `PAYMENT.SALE.DENIED`, `BILLING.SUBSCRIPTION.UPDATED`,
`BILLING.SUBSCRIPTION.CANCELLED`. The Webhook ID shown after creation goes in
`PAYPAL_WEBHOOK_ID` — it's required for signature verification (PayPal's server-side check
needs it, unlike Stripe/Razorpay's local HMAC schemes).

**Verification is a live API call**: unlike Stripe/Razorpay, PayPal's webhook signature
verification (`PayPalProvider.verifyWebhookSignature`) calls PayPal's own
`/v1/notifications/verify-webhook-signature` endpoint rather than computing a local HMAC — this
means webhook processing has a hard dependency on PayPal's API being reachable at the moment a
webhook arrives, not just at credential-setup time. Worth knowing operationally.

**No standalone customer object**: PayPal's subscription flow doesn't have a separate
"create customer" step — `PayPalProvider.createCustomer()` returns a locally-generated
reference id that does not round-trip through any PayPal API call. See that method's comment.

## Not Configured / Reserved For Future Work

`PADDLE` and `LEMONSQUEEZY` exist as `PaymentProviderType` enum values (named in the original
Module 004 prompt's "Future" provider list) but have **no adapter implementation** —
`PaymentProviderRegistry.get("PADDLE")` will throw "Unknown payment provider." Adding either is
explicitly out of scope for this phase (see the Phase 5 prompt's "What not to include: more
payment providers") and is future work, not a gap in what was asked for this phase.

## Verifying Your Configuration

```bash
# After setting credentials, confirm the platform sees them:
curl -H "Authorization: Bearer <your JWT>" https://<your-domain>/api/v1/billing/plans
# then, as an org OWNER/ADMINISTRATOR:
curl -X POST -H "Authorization: Bearer <your JWT>" -H "Content-Type: application/json" \
  -d '{"planKey":"starter","billingCycle":"MONTHLY","billingEmail":"you@example.com","provider":"STRIPE"}' \
  https://<your-domain>/api/v1/billing/organizations/<orgId>/subscription
```
A `500` here with a message like `"Stripe createCustomer failed: ..."` means credentials are
present but something about the request/account is wrong (check the Stripe Dashboard's API
logs); a `ValidationError` "not configured on this environment" means the credentials
themselves are missing.
