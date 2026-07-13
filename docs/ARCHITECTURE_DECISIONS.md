# RMSM AI — Architecture Decisions

A living record of decisions that shape how future modules integrate with this codebase.
Each entry links back to the module doc where it was first established, so this file stays
short — it's an index of *what was decided*, not a re-explanation of *why* in full. Full
reasoning lives in the linked module documentation.

---

### ADR-001 — Organization is the tenant boundary
No separate `Tenant` model exists. `Organization` *is* the multi-tenancy unit — every
tenant-scoped query filters by `organizationId`, not by some other tenant identifier.
Module 002's `UserRole.tenantId` (reserved, always `null`) was evaluated and deliberately not
activated for this purpose — see ADR-002.
_Confirmed: Module-003 Phase-2 Review Response._

### ADR-002 — Platform RBAC and Organization Roles are separate systems
Module 002's `Role`/`Permission` tables govern platform-wide capabilities (e.g. admin portal
access). `OrganizationMembership.role` governs what a user can do *inside a specific
organization*. These are not merged, not layered as parent/child, and not resolved through a
shared table — a user's effective permission for an organization-scoped action is the
intersection of both systems, computed by application code (an `OrganizationRoleGuard`), not
by the schema.
_Source: `docs/modules/MODULE_003_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`, ADR-006._

### ADR-003 — Organization slugs are permanent
Once assigned, a slug is never released or reused — not on archive, not on soft delete.
Reasons: preserves audit history, prevents URL reuse, avoids phishing/impersonation risk via
slug squatting, keeps external integrations and future webhooks stable. A customer wanting a
similar identifier later must choose a different slug. This requires no additional enforcement
code beyond what already exists: `Organization.slug` carries a hard, non-partial `@unique`
constraint, and no repository method releases or reassigns a slug during archive/delete.
_Confirmed: Module-003 Phase-2 Review Response. Originally flagged as an open question in
`MODULE_003_PHASE_2_REPOSITORIES.md`, Section 5._

### ADR-004 — Critical integrity invariants get both application and database enforcement
RMSM follows defense-in-depth for rules where a violation would be a serious, hard-to-detect
data integrity problem. "Exactly one active Owner per organization" is enforced twice:
(1) application-layer validation in `OrganizationMembershipService`, with ownership transfers
wrapped in a single Prisma transaction that re-verifies the invariant immediately before
committing; (2) a hand-written partial unique index at the database layer
(`organization_memberships_one_active_owner`), since Prisma's schema DSL cannot express
partial/filtered unique indexes natively. The database layer is the backstop against
concurrent transactions, race conditions, future code regressions, and direct SQL writes that
bypass the service layer — not the primary mechanism, which stays in the service so error
messages remain meaningful to API callers.
_Source: Module-003 Phase-2 Review Response, Decision 1. Migration:
`packages/database/prisma/manual-migrations/single_active_owner_constraint.sql`._

### ADR-005 — Membership history is never deleted
`OrganizationMembership` rows persist for the lifetime of a user's relationship with an
organization — leaving or being removed transitions `status` (`LEFT`/`REMOVED`), it never
deletes the row. A separate append-only `OrganizationMembershipEvent` table records the full
timeline (invited, joined, role changes, suspensions, ownership transfers). This is distinct
from Module 002's `AuditLog`, which is a platform-wide security/compliance trail, not a
product-facing membership timeline.
_Source: `docs/modules/MODULE_003_PHASE_2_REPOSITORIES.md`, Section 1._

### ADR-006 — Repositories are single-table; transactions are a service-layer concern
Every Module 003 repository method is scoped to one Prisma model and accepts an optional
`DbClient` (defaulting to the global singleton) as its final parameter. No repository opens a
transaction or calls another repository. Multi-table atomicity (organization creation +
initial owner membership + history event; ownership transfer; invitation acceptance) is
composed entirely in the service layer via `prisma.$transaction`, passing the transaction
client through to each repository call.
_Source: `docs/modules/MODULE_003_PHASE_2_REPOSITORIES.md`, Section 3._

### ADR-007 — User preferences extend `Profile`, never a parallel table
Module 003's user-preference fields (locale, theme, dashboard layout, default organization,
security/trading/accessibility preferences) were added as new nullable/defaulted columns on
Module 002's existing `Profile` model, not a new `UserPreference` table — avoiding both data
duplication and 1:1-sync logic between two tables that would always need to agree.
_Source: `docs/modules/MODULE_003_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`, ADR-007._

### ADR-008 — Invitation tokens follow Module 002's existing hashed-token pattern
`OrganizationInvitation.tokenHash` stores a SHA-256 hash only, generated via Module 002's
`TokenService.hashToken()` (reused, not duplicated) — same approach as `PasswordReset` and
`EmailVerification`. Raw tokens are emailed once and never persisted.
_Source: `docs/modules/MODULE_003_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`, ADR-008._

### ADR-009 — Forward-compatible Billing extension points, unenforced today
`Organization.billingCustomerId` and `Organization.seatsLimit` exist as reserved, nullable
columns so a future Subscription/Billing module can attach itself without a migration. No
Module 003 code reads or writes either field.
_Source: `docs/modules/MODULE_003_PHASE_2_REPOSITORIES.md`, Section 1._

### ADR-010 — Two authorization layers on every organization-scoped write endpoint
Module 002's `PermissionsGuard` (platform-wide, JWT-embedded permissions) and the new
`OrganizationRoleGuard` (per-organization membership role) are applied together, not as
alternatives. `PermissionsGuard` answers "does this account tier have this feature at all";
`OrganizationRoleGuard` answers "does this specific user hold a sufficient role in this
specific organization." Neither can answer the other's question — `PermissionsGuard` has no
concept of organizations, and `OrganizationRoleGuard` has no concept of platform-tier feature
gating. `OrganizationRoleGuard` is new code (not a modification of Module 002's guards),
fulfilling the guard Phase 1's ADR-002 said Phase 4 would need to build.
_Source: `docs/modules/PHASE4_IMPLEMENTATION.md`, Section 1._

### ADR-011 — Billing is organization-scoped, never user-scoped
Every Module 004 model (`OrganizationSubscription`, `BillingAccount`, `Invoice`, `Payment`,
usage, coupons) carries `organizationId`, never `userId`. A user's billing relationship with
the platform is always mediated through the organization(s) they belong to — direct
consequence of ADR-001 ("Organization is the tenant boundary"). There is no per-user
subscription concept anywhere in this schema.
_Source: `docs/modules/MODULE_004_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-012 — Payment provider abstraction mirrors Module 002's OAuth registry pattern
`PaymentProviderAdapter` (abstract class) + a future `PaymentProviderRegistry` (Phase 3) is
structurally the same pattern as `OAuthProviderStrategy` + `OAuthProviderRegistry` from Module
002 — proven, consistent, and deliberately reused rather than inventing a new abstraction
shape. No provider SDK (Stripe's or otherwise) is a dependency of any service, controller, or
DTO; only provider *implementation* classes (Phase 3) touch a provider's actual API, the same
way Module 002's OAuth providers use raw `fetch` against REST endpoints rather than an SDK.
_Source: `docs/modules/MODULE_004_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-013 — Money is always integer cents
Every price/amount field (`monthlyPriceCents`, `totalCents`, `amountCents`, etc.) is an
integer number of the currency's smallest unit, never a float. Standard practice for avoiding
floating-point rounding bugs in financial calculations, and matches Stripe's own native unit —
no conversion layer needed when Stripe support is implemented in Phase 3.
_Source: `docs/modules/MODULE_004_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-014 — Plan tier ambiguity, resolved and flagged
The Module 004 prompt listed plan tiers as "Free / Starter / Professional / Enterprise /
Unlimited / Support" with each on its own line — ambiguous whether "Support" is a sixth tier
or an artifact (e.g. bleeding from a "Priority Support" feature). Resolved as **5 tiers**
(FREE, STARTER, PROFESSIONAL, ENTERPRISE, UNLIMITED); "Support" was not modeled as a tier.
Flagged explicitly for confirmation rather than silently guessed — if a sixth tier or a
differently-named set was intended, seed data (Phase 5) is a one-line change, not a schema
change, since `SubscriptionPlan` rows are data, not enum values.
_Source: `docs/modules/MODULE_004_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-015 — Webhook idempotency via unique provider event id
`PaymentWebhook.providerEventId` is unique at the database level. Every provider's webhook
delivery is at-least-once, not exactly-once — WebhookService (Phase 3) will check for an
existing row with the same `providerEventId` before processing, and the unique constraint is
the backstop against a race between two simultaneous deliveries of the same retried event,
mirroring ADR-004's defense-in-depth philosophy (application check + database constraint, not
either alone).
_Source: `docs/modules/MODULE_004_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-016 — Notification models resolve "ambiguous model-or-enum" the same way Module 004 did
The Module 005 prompt's model list included `NotificationChannel`, `NotificationStatus`,
`NotificationPriority`, and `NotificationType` alongside genuine entities. These four describe
classification/state, not things with their own id/lifecycle/relations — modeled as enums,
resolving the ambiguity the identical way Module 004's Phase 1 resolved
`SubscriptionStatus`/`BillingCycle`/etc.
_Source: `docs/modules/MODULE_005_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-017 — NotificationQueue is a durable companion to BullMQ, not a replacement
Module 001's BullMQ/Redis queue owns fast in-flight job state. `NotificationQueue` (Prisma) is
the durable, queryable audit trail an admin dashboard needs once a job completes, fails, or
expires — Redis-backed queues don't retain that. Phase 2's `QueueService` keeps both in sync;
this is not a second queue system competing with BullMQ.
_Source: `docs/modules/MODULE_005_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-018 — Notification provider abstraction reuses the Module 004 pattern exactly, three times
`EmailProviderAdapter`/`SmsProviderAdapter`/`PushProviderAdapter` + their registries are
structurally identical to `PaymentProviderAdapter`/`PaymentProviderRegistry` — same "adapter
interface + registry + factory, no SDK coupling in anything above the provider layer"
philosophy, applied once per channel family instead of once for payments. Not a new pattern;
the third consecutive reuse of one already proven twice (OAuth in Module 002, payments in
Module 004).
_Source: `docs/modules/MODULE_005_PHASE_1_SPEC_ARCHITECTURE_SCHEMA.md`._

### ADR-019 — Repository unit tests mock `@rmsm/database` directly; this is the standard, not an exception
Every repository imports the `prisma` singleton directly (not via constructor injection of the
client itself), which had made repositories effectively untestable in this sandbox — every
test touching `@rmsm/database` failed at import time (`PrismaClient is not a constructor`,
since `prisma generate` has been network-blocked since Module 001). `jest.mock("@rmsm/database",
...)` replaces the entire module before the real one (and its blocked constructor call) is ever
imported, which let Module 005's Phase 2a repository tests actually execute and pass — the
first genuinely-running database-adjacent test coverage in this project. Confirmed as the
project standard for all repository unit tests going forward, not a one-off workaround: new
repositories should ship with `jest.mock("@rmsm/database", ...)`-based tests from the start,
following the shape in `notification-preference.repository.spec.ts` and
`notification.repository.spec.ts` (Module 005 Phase 2a).
_Source: `docs/modules/MODULE_005_PHASE_2A_REPOSITORIES.md`, Section 8. Confirmed as binding
standard in the Phase 2a approval response._

### ADR-020 — Two missing back-relations blocked Prisma client generation entirely; a real limit of the stub-based typecheck method is now explicit
The user ran a real `prisma generate` (unblocked on their machine) and hit schema-validation
errors across every module — the cause was two missing back-relation fields:
`OrganizationMembershipEvent.organization → Organization` had no corresponding
`Organization.membershipEvents` field, and `Invoice.subscription → OrganizationSubscription`
had no corresponding `OrganizationSubscription.invoices` field. Prisma refuses to generate a
client at all when any relation is unpaired — not a partial failure, a total one — which is
why it surfaced as errors in every downstream package rather than something narrower. Both
fixed; a scripted audit of all 73 relation pairs in the schema found no further instances.

**The real lesson, stated plainly rather than left implicit**: this project's stub-based
typecheck verification (used in every phase's docs since the TS2742 fix, whenever real
`prisma generate` was blocked) is a hand-maintained `.d.ts` file disconnected from
`schema.prisma` itself — it can prove TypeScript-level correctness against *assumed* types, but
it structurally cannot catch a schema-relation-pairing error, because the stub never derives
from the real schema in the first place. Every phase's verification section has said "this is
not a substitute for real Prisma validation" — this is a concrete instance of exactly what that
caveat meant, not a hypothetical one. The fix here came from the one thing that actually
validates the schema: a real `prisma generate` run, which this sandbox still cannot perform
itself.
_Source: user-reported fix; verified and audited in this conversation._

---

## How to add to this file
When a decision is made that a *future module* needs to know about (not an implementation
detail scoped to one module), add an entry here with a one-paragraph summary and a link to the
module doc with the full reasoning. Keep entries short — this file's job is discoverability,
not depth.
