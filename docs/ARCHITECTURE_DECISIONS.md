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

---

## How to add to this file
When a decision is made that a *future module* needs to know about (not an implementation
detail scoped to one module), add an entry here with a one-paragraph summary and a link to the
module doc with the full reasoning. Keep entries short — this file's job is discoverability,
not depth.
