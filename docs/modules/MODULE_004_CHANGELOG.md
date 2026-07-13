# Changelog — Module 004: Billing & Subscription Management

## Phase 5 — Engineering Hardening, Testing, Documentation, Release

### Added
- Billing seed data: 5 subscription plans (Free/Starter/Professional/Enterprise/Unlimited,
  per ADR-014), 11 feature flags (exact examples from the original prompt), per-plan
  feature/quota grants — all placeholder defaults, explicitly flagged as such (no pricing spec
  was ever provided)
- 4 new e2e test suites: `billing-checkout.e2e-spec.ts` (7 cases), `billing-webhook.e2e-spec.ts`
  (6 cases, including a real idempotency test), `billing-concurrency.e2e-spec.ts` (3 cases,
  `Promise.all()`-based races), `billing-security.e2e-spec.ts` (8 cases)
- `MODULE_004_API_DOCUMENTATION.md`, `MODULE_004_ARCHITECTURE.md` (5 Mermaid diagrams),
  `PAYMENT_PROVIDER_CONFIGURATION.md`, this changelog

### Changed
None — no application code (schema, repositories, services, controllers, DTOs, guards) was
modified this phase. Per this phase's explicit "no new features" instruction, the only
non-test, non-documentation change is the seed data addition above, which is configuration for
existing functionality, not new functionality.

### Verified (engineering review, no code changes resulted)
- Every class in `apps/api/src/modules/billing/` is registered in `billing.module.ts` — no
  orphaned providers
- No circular dependency between `BillingModule` and `OrganizationsModule`
- Zero TODO/FIXME/placeholder comments across the entire billing module
- Zero `console.*` calls (Logger used consistently where operational logging exists)
- Zero bare `any` types
- Error handling is consistent: domain rule violations use `@rmsm/shared`'s typed errors
  (`NotFoundError`/`ValidationError`/`ConflictError`/`ForbiddenError`); genuine external-API
  failures in provider adapters use plain `Error`, which `GlobalExceptionFilter` correctly
  maps to `500` — a deliberate distinction (domain error vs. infrastructure failure), not an
  inconsistency

## Phase 4 — Controllers, DTOs, Subscription Middleware/Guards
9 controllers, 12 DTOs, 4 subscription guards (`ActiveSubscriptionGuard`, `FeatureGuard`,
`PlanGuard`, `QuotaGuard`) + decorators. `main.ts` gained `rawBody: true` (additive, needed for
webhook signature verification). See `MODULE_004_PHASE_4_CONTROLLERS.md`.

## Phase 3b — Services
All 9 services named in the original prompt (`BillingService`, `SubscriptionService`,
`InvoiceService`, `PaymentService`, `CouponService`, `UsageService`, `QuotaService`,
`FeatureService`, `WebhookService`). Three real bugs caught and fixed during authoring — see
`MODULE_004_PHASE_3B_SERVICES.md` Section 1 for the full account, including an accidental
placeholder that was caught and closed before delivery.

## Phase 3a — Payment Providers
`MockProvider`, `StripeProvider`, `RazorpayProvider`, `PayPalProvider` (added per explicit
instruction — not in the original prompt's "Future" list), `PaymentProviderRegistry`. Two
Phase 1 interface amendments found while building PayPal for real — see
`MODULE_004_PHASE_3A_PAYMENT_PROVIDERS.md` Section 1.

## Phase 2 — Repositories
12 repositories, one per Phase 1 model. One real bug caught by typecheck (a named interface
without an index signature isn't assignable to `Record<string, unknown>`) — see
`MODULE_004_PHASE_2_REPOSITORIES.md` Section 3.

## Phase 1 — Specification, Architecture, Database Schema
12 new Prisma models, 9 enums (5 named in the prompt, 4 flagged additions), the
`PaymentProviderAdapter` interface. One ambiguity flagged and resolved (plan tier count — see
ADR-014). See `MODULE_004_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`.

---

**Release**: `v0.4.0-module004-complete` — see `PHASE5_IMPLEMENTATION.md`'s Release section for
the exact tag command and why it could not be executed from inside this sandbox.
