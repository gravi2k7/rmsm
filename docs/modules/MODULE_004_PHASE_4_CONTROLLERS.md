# Module 004 — Billing & Subscription Management
## Phase 4: Controllers, DTOs, Subscription Middleware/Guards

Status: Complete — Awaiting Approval Before Phase 5

9 controllers, 12 DTOs, 4 subscription-middleware guards + decorators, and one small,
necessary, additive change to `main.ts`. Every controller reuses Module 002's
`PermissionsGuard`/`@RequirePermissions` and Module 003's `OrganizationRoleGuard`/
`@RequireOrgRole` exactly as they are — no parallel authorization system for billing.

## 1. The One Infrastructure Change This Phase Required

Webhook signature verification (Stripe's HMAC, Razorpay's HMAC, PayPal's server-side check)
all need the **exact raw bytes** of the request body — not NestJS's default JSON-parsed
object, which cannot be guaranteed to re-serialize byte-for-byte identical to what a provider
actually signed. This requires enabling Nest's built-in `rawBody: true` option in
`main.ts`'s `NestFactory.create()` — a one-line, additive, non-breaking change (every existing
endpoint's JSON body parsing is completely unaffected; this only adds `req.rawBody` as an
extra, previously-absent property). Flagged explicitly since `main.ts` is a Module 001/002
file this phase would otherwise have no reason to touch.

## 2. Controllers Delivered (route summary — full detail in `API_ENDPOINTS.md`-equivalent, see Section 6)

| Controller | Base path | Auth |
|---|---|---|
| `PlansController` | `billing/plans` | **Public** (Section 3) |
| `SubscriptionController` | `billing/organizations/:organizationId/subscription` | Permission + org role |
| `BillingAccountController` | `billing/organizations/:organizationId/account` | Permission + org role |
| `InvoiceController` | `billing/organizations/:organizationId/invoices` | Permission + org role |
| `PaymentController` | `billing/organizations/:organizationId/payments` | Permission + org role |
| `UsageController` | `billing/organizations/:organizationId/usage` | Permission + org role |
| `CouponController` | `billing/organizations/:organizationId/coupons` | Permission + org role |
| `AdminBillingController` | `billing/admin` | Permission only (platform-wide, not org-scoped — Section 4) |
| `WebhookController` | `billing/webhooks/:provider` | **Public** (Section 1) |

## 3. `GET /billing/plans` Is Public — A Judgment Call

The prompt lists this endpoint with no auth qualifier, and a pricing page needs to be visible
to someone deciding whether to sign up at all — treating it like a marketing page, not an
authenticated resource. Every other billing endpoint requires auth. Flagged as a deliberate
choice, not an oversight, in case the actual product intent was different.

## 4. `AdminBillingController` Is Platform-Wide, Not Organization-Scoped

Plan/feature/quota administration isn't about any one organization — it's platform
configuration. So this controller uses only `PermissionsGuard` (`billing.admin.manage`,
seeded to ADMIN/SUPER_ADMIN), no `OrganizationRoleGuard` — there's no `:organizationId` in its
routes for that guard to check. Consistent with how Module 002's `RbacController` (platform
role/permission management) is also permission-only, no org-role dimension.

## 5. Subscription Middleware — How the Four Guards Actually Differ

- **`ActiveSubscriptionGuard`**: unconditional wherever applied — no decorator/metadata needed,
  since it always checks the same thing (subscription status is ACTIVE or TRIALING).
- **`FeatureGuard`** (`@RequireFeature(key)`): calls `FeatureService.assertFeatureEnabled` —
  throws 403 if the plan doesn't grant the feature at all.
- **`PlanGuard`** (`@RequirePlan(...keys)`): checks the organization's *current plan key*
  directly — for gating an endpoint to specific tiers (e.g. "Enterprise only"), independent of
  whether a feature flag exists for it.
- **`QuotaGuard`** (`@RequireQuota(key, amount)`): calls `QuotaService.assertWithinQuota` —
  throws 409 (not 403 — a quota problem is "valid request, can't be fulfilled right now," a
  meaningfully different signal than "not allowed at all"; the guard deliberately does not
  wrap `QuotaService`'s `ConflictError` into a `ForbiddenError`).

None of these four are wired onto any billing controller in this phase — they're
infrastructure for **other, future modules** to protect their own endpoints (e.g. "Strategy
Builder requires the `automation` feature," "AI Analysis Engine requires remaining
`ai_tokens` quota"), matching the prompt's Section 10 framing ("Protect endpoints") rather
than being specific to billing's own CRUD surface.

## 6. DTOs

12 total: `CreateSubscriptionDto`, `ChangeSubscriptionDto`, `CreateBillingAccountDto` (+
nested `BillingAddressDto`), `UpdateBillingAccountDto`, `InvoiceSearchDto` (extends the
existing `PaginationDto` from the organizations module — reused, not duplicated),
`ValidateCouponDto`, `ApplyCouponDto`, `UsageHistoryQueryDto`, `CreatePlanDto`, `UpdatePlanDto`,
`CreateFeatureFlagDto`, `UpsertPlanFeatureDto`. All `class-validator`/`class-transformer`,
whitelist-compatible, zero `any`/unsafe `unknown`.

**No DTO for invoice/payment creation** — per the spec's API section, Invoices and Payments
only list Get/List operations, not create. `InvoiceService.createInvoice()` (Phase 3b) remains
service-layer-only, for future billing-cycle automation to call, not exposed as a direct API
endpoint — a deliberate scope match to what was actually specified, not an oversight.

## 7. Webhook Signature Handling — Provider-Specific, Documented

`WebhookController.extractSignatureHeader()` assembles what each provider's adapter
(Phase 3a) actually needs: Stripe and Razorpay each get one header value passed straight
through; PayPal needs five separate headers bundled into the JSON structure its
`verifyWebhookSignature` implementation expects (documented in that method's own comment back
in Phase 3a — this phase is where that documented expectation actually gets satisfied by a
real caller for the first time).

## 8. Permissions — Extending, Not Duplicating, the Existing Tier Philosophy

9 new permission keys (`billing.subscription.read/manage`, `billing.account.read/manage`,
`billing.invoice.read`, `billing.payment.read`, `billing.usage.read`, `billing.coupon.apply`,
`billing.admin.manage`), seeded with the same FREE_USER-gets-read-only /
SUBSCRIBER-gets-full-management split Module 003 Phase 4 already established for organization
permissions — not a new judgment call, an extension of the one already made and flagged there.

## 9. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/database`) | ✅ 0 errors — clean on first pass this phase |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — clean on first pass |
| Existing unit tests | ✅ 21/21 unaffected |
| TODO/placeholder/bare-`any` scan | ✅ none found |

Same standing caveat as every phase: this sandbox cannot run `prisma generate`, start the app,
or reach any real payment provider. No e2e tests exist yet for these endpoints — that's Phase
5's explicit job, not silently skipped here.

## 10. What's Deferred to Phase 5

Tests (unit + e2e, following the exact pattern established in Module 003's Phase 5),
documentation (`MODULE_004_...md` consolidated doc, API contract doc), migration runbook
verification, and final `pnpm build`/`git status clean` sign-off per the prompt's stated
completion criteria.

---

**Awaiting your review before Phase 5 (Tests, Documentation, Migration, Final Verification).**
