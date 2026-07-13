# Module 004 — Billing & Subscription Management
## Phase 3a: Payment Providers (Mock, Stripe, Razorpay, PayPal) & Gateway Abstraction

Status: Complete — Awaiting Approval Before Phase 3b (Services)

Your message scoped this phase specifically to payment providers, so that's what this delivers
— the 9 services (`BillingService`, `SubscriptionService`, etc.) originally planned for
"Phase 3" are deferred to the next phase (renumbered **Phase 3b** so the split is traceable),
not silently dropped.

## 1. Two Phase 1 Interface Amendments — Found During Real Implementation, Not Silent

Building PayPal's implementation for real (not a stub) surfaced two gaps in the
`PaymentProviderAdapter` interface delivered in Phase 1 and already approved. Both are fixed
here, both are explained rather than quietly patched:

**`verifyWebhookSignature`: `boolean` → `Promise<boolean>`.** Stripe and Razorpay both sign
webhooks with a local HMAC scheme — a synchronous check was fine for them. PayPal's
verification is a *required* server-to-server call to PayPal's own
`/v1/notifications/verify-webhook-signature` endpoint (certificate-based signing). There's no
honest local-HMAC shortcut for PayPal short of implementing a full X.509 certificate-chain
validator myself, which I'm not willing to do for a security-relevant check just to keep an
interface synchronous. The interface was wrong for a provider that didn't exist in the Phase 1
design yet — corrected before any caller depends on the old signature. Stripe's and Razorpay's
implementations are trivially `async` wrappers around the same HMAC comparison; nothing about
their correctness changes.

**Added `abstract readonly enabled: boolean`.** Needed by `PaymentProviderRegistry` (this
phase) to uniformly ask "is this provider actually configured" across all four
implementations, mirroring `OAuthProviderStrategy`'s exact shape from Module 002. Omitted from
Phase 1 because the registry itself — the thing that needs it — wasn't built yet.

## 2. Files Delivered

```
apps/api/src/modules/billing/
├── interfaces/payment-provider.interface.ts   — amended (Section 1)
└── providers/
    ├── mock.provider.ts
    ├── stripe.provider.ts
    ├── razorpay.provider.ts
    ├── paypal.provider.ts
    └── payment-provider.registry.ts

packages/database/prisma/schema.prisma   — +1 enum value (PaymentProviderType.PAYPAL)
packages/config/src/env.schema.ts         — +14 provider config keys (all optional/defaulted)
apps/api/src/modules/billing/billing.module.ts   — +5 providers registered
```

## 3. No SDK Coupling — How Each Provider Actually Talks to Its API

Every provider is implemented against its REST API directly via `fetch`, mirroring Module
002's OAuth providers exactly (no `stripe`, `razorpay`, or `paypal` npm package anywhere in
this codebase). Three real API-shape differences are documented inline rather than smoothed
over:

- **Razorpay has no Stripe-style hosted Checkout Session for subscriptions.**
  `createCheckoutSession` uses Razorpay's Payment Links API instead — the closest equivalent,
  not a literal match.
- **PayPal has no standalone "create customer" endpoint.** Payer info is supplied at
  subscription-creation time. `createCustomer` returns a locally-generated reference id purely
  to satisfy the shared interface shape — it round-trips through nothing on PayPal's side, and
  the code comment says so explicitly so a future caller doesn't assume otherwise.
- **PayPal doesn't return a subscription's period-end at creation time** the way Stripe/
  Razorpay do — it's approximated from the requested billing cycle and flagged as provisional,
  to be reconciled from the `subscription.updated` webhook once that arrives.

**Webhook signature verification**, implemented per each provider's own public documentation:
- Stripe: HMAC-SHA256 over `${timestamp}.${rawBody}`, parsed from the `Stripe-Signature`
  header's `t=...,v1=...` format, timing-safe compared.
- Razorpay: HMAC-SHA256 over the raw body, compared against `X-Razorpay-Signature` — same
  algorithm family as Stripe, simpler header (no timestamp component).
- PayPal: the required server-side verification call (Section 1).
- Mock: a real (if simplified) HMAC scheme using a dev-only shared secret, so local
  development and future tests can exercise the full webhook code path without needing a real
  provider account — the same reasoning that makes `MockProvider` the one implementation this
  module is explicitly allowed to mock.

## 4. Registry

`PaymentProviderRegistry` is structurally identical to Module 002's `OAuthProviderRegistry` —
`get(provider)` throws if unknown or unconfigured, `listEnabled()` reports what's actually
usable on the current environment. A fifth provider (Paddle or LemonSqueezy, both named in the
original prompt's "Future" list) means implementing `PaymentProviderAdapter` and adding one
line to the registry's constructor — no other file changes.

## 5. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/config`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/api`) | ✅ 0 errors — first attempt, no fixes needed this time |
| `@rmsm/config` unit tests | ✅ 2/2 unaffected (all new env keys optional/defaulted) |
| Existing `@rmsm/api` unit tests | ✅ 21/21 unaffected |
| TODO/placeholder/bare-`any` scan | ✅ none found in `modules/billing/` |

Same standing caveat as every phase: `prisma validate`/`generate` and any live call to a real
provider's API remain unexecutable in this sandbox (network policy blocks both Prisma's binary
host and, deliberately, everything else except npm/PyPI/GitHub — so Stripe/Razorpay/PayPal's
actual endpoints were never reachable here either). Every provider's request/response shape was
built directly from each provider's public API documentation and cross-checked field by field,
which is the strongest verification available without live credentials — not a substitute for
an actual sandbox-account integration test, which is real, necessary follow-up work once this
reaches an environment that can reach those APIs.

## 6. What's Deferred to Phase 3b

The 9 services this module still needs: `BillingService`, `SubscriptionService`,
`InvoiceService`, `PaymentService`, `CouponService`, `UsageService`, `QuotaService`,
`FeatureService`, `WebhookService`. These are what will actually call
`PaymentProviderRegistry.get(...)`, open transactions across the Phase 2 repositories, and
assemble the `NormalizedWebhookEvent` PayPal's `verifyWebhookSignature` needs (Section 1's note
on `WebhookService` owning that header-bundling responsibility).

---

**Awaiting your review before Phase 3b (the 9 services).**
