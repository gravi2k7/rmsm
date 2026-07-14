# Module 005 — Phase 2 Implementation Plan

Proposed breakdown, following the same phased-delivery discipline as Modules 003/004 (stop for
approval at each stage). Actual phase count/boundaries open to adjustment based on your
feedback on this plan.

## Phase 2a — Repositories
16 implementation classes (one per model, per the Developer Guide's discipline note), matching
Phase 1's repository-contract interfaces exactly. No business logic — single-table CRUD +
query primitives only, `DbClient`-parameterized throughout. Estimated similar scope to Module
004's Phase 2 (12 repositories) plus ~30% for the additional 4 models.

## Phase 2b — Providers
- 5 email adapters (SMTP, SES, SendGrid, Mailgun, Resend) + `EmailProviderRegistry` +
  `ProviderFactory`'s email half
- 4 SMS adapters (Twilio, MessageBird, Vonage, AWS SNS) + `SmsProviderRegistry`
- 2 push adapters (FCM, APNs) + `PushProviderRegistry`
- `TemplateEngine` implementation (likely Handlebars-backed, per Phase 1's interface comment)
- `QueueAdapter` implementation wrapping Module 001's existing BullMQ setup

This is the largest single chunk of Phase 2 — 11 provider adapters total, each needing the same
"real REST API integration, no SDK, verified against the provider's actual public
documentation" treatment Module 004 gave Stripe/Razorpay/PayPal. Worth considering splitting
this into 2b-email, 2b-sms, 2b-push as separate approval checkpoints given the size — your call.

## Phase 2c — Services
14 services per Phase 1's contracts. `NotificationService` (the orchestrator) depends on nearly
everything else, so it's built last within this phase, after `PreferenceService`,
`TemplateService`, `QueueService`, and the three channel services exist.

## Phase 3 — Controllers, DTOs refinement, Guards
5 controllers (`NotificationController`, `NotificationTemplateController`,
`NotificationPreferenceController`, `WebhookController`, `AdminNotificationController`), wiring
Module 002's `PermissionsGuard` + Module 003's `OrganizationRoleGuard` exactly as Module 004's
Phase 4 did for billing. New permission keys (`notification.*`) seeded following the same
tier-philosophy precedent (flagged, not silently decided, same as every prior module).

## Phase 4 — Testing, Documentation Finalization, Release
Repository/service/controller unit tests where mockable; e2e suites for send flows, webhook
processing (with real idempotency tests, following Module 004 Phase 5's pattern), queue/retry
behavior, template rendering edge cases, concurrency (e.g. two simultaneous digest-processing
runs for the same user), and security (cross-org isolation, permission enforcement). Final
`pnpm typecheck`/`lint`/`test`/`build` verification and changelog consolidation.

## Explicit Non-Goals for Phase 2 Overall

Matching Phase 1's own scope discipline:
- No `NotificationTopic` subscription-management model (Phase 1 doc, Known Gaps) unless you
  confirm it's actually needed — `topic` stays a free-form string.
- No partial-unique-index migration for the two nullable-scope uniqueness gaps unless you want
  that prioritized before Phase 2a rather than after (flagging the decision point now, not
  assuming either answer).
- No UI work — this project's Next.js apps (`apps/web`, `apps/admin`) are unaffected by this
  module until a future, separate frontend integration effort.

---

**Awaiting your approval of this plan (or adjustments to it) before Phase 2a begins.**
