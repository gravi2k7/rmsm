# Module 004 — Billing & Subscription Management
## Phase 2: Repositories

Status: Complete — Awaiting Approval Before Phase 3

12 repositories, one per Phase 1 model, following the exact pattern established in Module
003 Phase 2: single-table, zero business logic, every method takes an optional `DbClient` for
transaction composition, every return type explicit and named from `@rmsm/database` from the
start (not retrofitted — that discipline cost real rework in Module 003 and paid for itself
immediately here, see Section 3).

## 1. Files Delivered

```
apps/api/src/modules/billing/repositories/
├── subscription-plan.repository.ts
├── feature-flag.repository.ts
├── plan-feature.repository.ts
├── organization-subscription.repository.ts
├── billing-account.repository.ts
├── invoice.repository.ts
├── invoice-line.repository.ts
├── payment.repository.ts
├── coupon.repository.ts
├── coupon-redemption.repository.ts
├── usage-record.repository.ts
└── payment-webhook.repository.ts

apps/api/src/modules/billing/billing.module.ts   — new, registers all 12
apps/api/src/app.module.ts                        — +1 import, +1 line (BillingModule registered)
packages/database/src/index.ts                    — +4 named payload types
```

## 2. The One Design Decision Worth Explaining: When `upsert` Is Actually Safe

This project has now hit Prisma 5.22's nullable-compound-unique-key limitation three times
(`RbacService.assignRole`, the TS2742-regression fix, `PermissionHelper.grantPlatformRole`) —
every time because `upsert`'s `where` clause needs to construct a compound key containing an
explicit `null`, which Prisma's generated type for that constraint doesn't accept.

Two of this phase's repositories use **real `upsert` calls** deliberately:
`PlanFeatureRepository.upsert()` (`[planId, featureFlagId]`) and
`UsageRecordRepository.incrementUsage()` (`[organizationId, period, metric]`). Both are safe
because **every field in both compound keys is required, never nullable** — the bug only exists
when a key component can be `null`, and SQL's `NULL != NULL` breaks uniqueness semantics for
that specific case. Called out explicitly in both files' comments so the distinction is
documented at the point of use, not just remembered.

## 3. A Real Bug Caught by Verification, Not Assumed Away

`BillingAccountRepository`'s JSON-conversion helper (`toInputJsonValue`) was first typed with
parameter type `Record<string, unknown>`, matching every prior instance of this helper across
the project. Typecheck caught something new here: `BillingAddress` (a named interface, not an
inline object type) isn't structurally assignable to `Record<string, unknown>` in TypeScript
unless it declares an index signature — a real, narrow gap in the pattern this project has
otherwise reused successfully four times. Fixed by typing the helper's parameter as `object`
instead, which accepts any non-primitive value without that restriction. This is worth noting
specifically because it's a case where "reuse the proven pattern" needed a one-line adjustment
rather than working unmodified — flagged rather than silently patched.

## 4. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/api`) | ✅ 0 errors (1 real bug found and fixed — Section 3) |
| Existing unit tests | ✅ 21/21 unaffected |

Same standing caveat as every phase: `prisma validate`/`generate` remain blocked by this
sandbox's network policy. Typecheck was verified against an extended stub covering all 12 new
models, their enums, and the 4 new `GetPayload`-equivalent named types — not a substitute for
real Prisma validation, and the first genuine check this schema addition gets should still be
`pnpm --filter @rmsm/database generate` on a machine with normal network access.

## 5. What's Deferred to Phase 3

Every repository here is intentionally inert beyond CRUD — no invariant enforcement (e.g.
"can this coupon still be redeemed," "is this subscription's trial actually expired") lives in
this phase, matching Module 003's repository/service split. Phase 3 builds: `MockProvider` and
`StripeProvider` (implementing Phase 1's `PaymentProviderAdapter`), `PaymentProviderRegistry`,
and all 9 services (`BillingService`, `SubscriptionService`, `InvoiceService`, `PaymentService`,
`CouponService`, `UsageService`, `QuotaService`, `FeatureService`, `WebhookService`) —
orchestrating these repositories, opening transactions where multi-table atomicity is needed
(e.g. subscription creation + initial invoice), and calling `AuditService` for every mutation.

---

**Awaiting your review before Phase 3 (Services + Provider Implementations).**
