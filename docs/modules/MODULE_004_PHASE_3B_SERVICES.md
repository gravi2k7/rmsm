# Module 004 — Billing & Subscription Management
## Phase 3b: Services

Status: Complete — Awaiting Approval Before Phase 4

All 9 services named in the original prompt: `BillingService`, `SubscriptionService`,
`InvoiceService`, `PaymentService`, `CouponService`, `UsageService`, `QuotaService`,
`FeatureService`, `WebhookService`. Every service depends only on Phase 2 repositories and
Phase 3a's `PaymentProviderRegistry` — no controller, DTO, or guard exists yet (Phase 4).

## 1. Three Real Bugs Caught During Authoring — Not by Tooling

Worth being specific about these rather than a generic "reviewed carefully," because each one
is a different *kind* of mistake, and naming the kind is more useful than just saying "fixed":

**`WebhookService.resolveOrganizationIdOrThrow` — an accidental placeholder.** My first draft
of this method always threw, regardless of input, because the repository method it needed
(`OrganizationSubscriptionRepository.findByProviderSubscriptionId`) didn't exist yet. That is
exactly the "placeholder" the prompt explicitly forbids, and I'd written it anyway on the way
to a working version. Caught on review before delivery — fixed by adding the missing
repository method for real and wiring genuine dispatch logic for `payment.succeeded`,
`payment.failed`, `invoice.paid`, `subscription.updated`, and `subscription.cancelled`. The
lesson isn't "don't write placeholders" (I know not to) — it's that a first draft heading
toward a real implementation can still pass through a placeholder-shaped intermediate state,
and that state needs to be caught before it ships, not assumed away because the final
destination was always going to be real.

**A synthetic string masquerading as a real foreign key.** While fixing the above, I initially
wrote `subscriptionService.cancelSubscription(organizationId, "system-webhook")` — passing a
fake string where `AuditLog.userId` expects either a real `User.id` or `null`. That string
would have violated the `AuditLog → User` foreign key the moment this ran against a real
database — a bug that typecheck and lint both stay silent on (the field's TypeScript type was
`string`, and `"system-webhook"` is a perfectly valid string), and would only have surfaced as
a runtime database error. Fixed by widening `cancelSubscription`'s `actorId` parameter to
`string | null`, matching Module 002's existing pattern for system-initiated audit entries
(`AuthService.recordLoginAttempt` already does this for failed logins with no matching user).

**An unawaited audit log call in `CouponService.createCoupon`.** First draft returned a
repository-call Promise without awaiting the audit log ahead of it — inconsistent with every
other method in this codebase, which awaits `AuditService.log()` before returning. Not a
correctness bug in the strict sense (the promise chain still resolves), but a real
consistency/reliability gap: an unawaited audit call can lose its error if the request context
tears down first. Fixed to match the established pattern.

None of these were caught by `pnpm lint` or `pnpm typecheck` — all three needed direct reading
of the code's actual behavior, which is why this section exists instead of just citing green
checkmarks.

## 2. Key Design Decisions

**Quota checking and usage recording are deliberately separate services calling separate
repository paths**, not one service doing both. `QuotaService.assertWithinQuota()` is meant to
run *before* a request proceeds (in a Phase 4 guard); `UsageService.recordUsage()` runs *after*
it succeeds. If they were the same call, a request that fails after the quota check would still
count against the organization's usage — the separation is what prevents that.

**`SubscriptionService.syncStatusFromProvider()` is the only path that can change subscription
status via `updateStatus()`, and it's explicitly documented as webhook-only** — not a general
setter. Bypassing the provider round-trip (i.e., letting arbitrary application code flip a
subscription to ACTIVE) would let RMSM's state drift from what the payment provider actually
believes is true.

**Invoice numbering uses a randomized scheme with retry-on-collision**, not a sequential
counter — documented in `InvoiceService.generateInvoiceNumber()`'s comment as a deliberate
choice to avoid the write contention a shared counter row would introduce, with an explicit
note that strict sequential numbering (if a compliance requirement surfaces later) is a schema
addition, not a service-layer change.

## 3. A Named, Real Gap — Not Hidden

`WebhookService.dispatch()`'s `subscription.updated` handler only syncs status, not the
renewed period end date, because `NormalizedWebhookEvent` (Phase 1/3a) doesn't currently carry
a `periodEnd` field — payment events need amount/currency, but a pure subscription-status
event needs a different field PayPal/Stripe/Razorpay's payloads *do* provide, just not
something this interface captures yet. Documented inline in the code rather than silently
producing a subscription row with a stale renewal date. Extending
`NormalizedWebhookEvent` with that field is a clean, additive follow-up — deliberately not
done speculatively here without a real provider sandbox to confirm the field's actual shape
across all three implemented providers first.

## 4. Files Delivered

```
apps/api/src/modules/billing/services/
├── billing.service.ts
├── subscription.service.ts
├── invoice.service.ts
├── payment.service.ts
├── coupon.service.ts
├── usage.service.ts
├── quota.service.ts
├── feature.service.ts
├── webhook.service.ts
└── __tests__/quota.service.spec.ts   — new, 7 test cases

apps/api/src/modules/billing/repositories/organization-subscription.repository.ts
  — +1 method: findByProviderSubscriptionId() (Section 1)
apps/api/src/modules/billing/billing.module.ts   — all 9 services registered
```

## 5. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors (1 unused-import caught and fixed) |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors |
| Existing unit tests | ✅ 21/21 unaffected |
| New `quota.service.spec.ts` (7 tests) | ⚠️ Written, typechecked, lint-clean — blocked at import time by the same pre-existing `PrismaClient is not a constructor` issue as `health.controller.spec.ts` and `membership.service.spec.ts` (any file transitively importing `@rmsm/database` hits this until `prisma generate` succeeds somewhere with real network access). Now 3 suites affected instead of 2 — not a new problem, the same one, one more instance of it. |
| TODO/placeholder/bare-`any` scan | ✅ none found (after the Section 1 fix) |

Same standing caveat as every phase: this sandbox still cannot run `prisma generate` or reach
any real payment provider's API. Everything above is the strongest verification available
without those two things.

## 6. What's Deferred to Phase 4

Controllers (Plans, Subscriptions, Billing Account, Invoices, Payments, Usage, Coupons, Admin),
DTOs, Swagger, and the subscription middleware/guards (`RequireActiveSubscription`,
`RequireFeature`, `RequirePlan`, `RequireQuota`) that will actually call `QuotaService`/
`FeatureService`/`SubscriptionService` from the request path.

---

**Awaiting your review before Phase 4 (Controllers, DTOs, Middleware/Guards).**
