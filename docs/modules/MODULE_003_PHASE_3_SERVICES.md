# Module 003 — User & Organization Management
## Phase 3: Services

Status: Complete — Awaiting Approval Before Phase 4 · Branch: `feature/module-003-user-organization`

Per the Phase-2 Review Response's guidance, this phase implements: Prisma transactions, domain
services, the ownership transfer workflow, the invitation acceptance workflow, the organization
creation workflow, audit logging, membership history, validation, and domain exceptions.
Repositories remain data-access only (nothing in Phase 2 was modified to add business logic —
one gap where a service had reached into `prisma` directly was found and fixed by adding proper
repository methods instead; see Section 3). Controllers are deferred to Phase 4, per your
instruction.

## 1. Decision 1 Implementation — Exactly One Active Owner, Defense in Depth

**Application layer** (`OrganizationMembershipService`):
- `changeRole()` rejects any transition into or out of `OWNER` outright — ownership changes
  must go through `transferOwnership()`, which is the only path that can ever touch the
  `OWNER` role, so there's exactly one place the invariant needs to be enforced for role
  changes.
- `removeMember()`, `suspendMember()`'s path, and `leaveOrganization()` all route through a
  shared `assertNotLastActiveOwner()` guard before acting.
- `transferOwnership()` checks the current Owner and target member's eligibility *before*
  opening a transaction, then **re-verifies the current Owner a second time inside the
  transaction**, immediately before writing — closing the gap where two concurrent transfer
  requests could both pass the outer check. If the second check fails, the whole operation
  throws `ConflictError` and nothing commits. No intermediate state (zero Owners, two Owners)
  is ever written, let alone observable.

**Database layer**: `packages/database/prisma/manual-migrations/single_active_owner_constraint.sql`
— a partial unique index on `organization_memberships(organizationId) WHERE role = 'OWNER' AND
status = 'ACTIVE'`. This is genuinely new work this phase, not a restatement of Phase 2: Prisma's
schema DSL cannot express it, so it's hand-written SQL with an explicit runbook for folding it
into real migration history (Section 5 — this sandbox still can't run `prisma migrate dev` to
generate the baseline that this index needs to sit on top of).

Both layers were requested explicitly and both are delivered — the application layer is the
one that produces meaningful error messages to API callers; the database layer is the backstop
Decision 1 asked for against races, regressions, and direct SQL writes.

## 2. Decision 2 Implementation — Permanent Slugs

No code change was needed. Phase 2's `OrganizationRepository` already had no method capable of
releasing a slug (soft delete doesn't touch `slug`; there's no "un-delete a slug" concept
anywhere). `docs/ARCHITECTURE_DECISIONS.md` (new this phase — see Section 6) records this as
ADR-003 so it's discoverable without re-deriving it from repository behavior.

## 3. Services Delivered

```
apps/api/src/modules/organizations/services/
├── organization.service.ts          — creation, details, rename, archive/restore, soft delete
├── membership.service.ts            — role changes, ownership transfer, suspend/reactivate/remove/leave
└── invitation.service.ts            — create, resend, cancel, accept, reject, expiry sweep

apps/api/src/modules/organizations/templates/
└── organization-invitation.template.ts

apps/api/src/modules/organizations/organizations.module.ts   — wires repos + services, imports AuthModule

packages/shared/src/errors.ts        — extended: ConflictError (409), ForbiddenError (403)
packages/shared/src/slug.ts          — new: checkSlugFormat(), slugify() (pure, shared with apps/web)
packages/database/prisma/manual-migrations/single_active_owner_constraint.sql   — new
docs/ARCHITECTURE_DECISIONS.md       — new
```

**One repository-boundary violation found and fixed during this phase**: `InvitationService`
initially called `prisma.organizationInvitation.findFirst(...)` and
`prisma.organizationInvitation.update(...)` directly for two operations Phase 2 hadn't
anticipated (checking for an existing pending invitation, and regenerating a token on resend).
Caught on review before delivery — added `findPendingByOrgAndEmail()` and `regenerateToken()`
to `OrganizationInvitationRepository` instead, and the service now goes through those like
everything else. Flagging this because "caught and fixed before delivery" is a more honest
claim than implying it never happened.

## 4. Transaction Boundaries (Prisma transactions, as required)

Three multi-table operations, each opened in the service layer per the Phase 2 pattern
(`prisma.$transaction(async (tx: Prisma.TransactionClient) => {...})`, passing `tx` to every
repository call inside):

1. **`OrganizationService.createOrganization()`** — organization + initial Owner membership +
   a `JOINED` history event, as one unit.
2. **`OrganizationMembershipService.transferOwnership()`** — re-verify current Owner, demote,
   promote, write two history events (one per party), as one unit.
3. **`OrganizationInvitationService.acceptInvitation()`** — mark invitation accepted, create or
   reactivate the membership, write an `INVITATION_ACCEPTED` history event, as one unit.

## 5. Audit Logging & Membership History (every mutation)

Every service method that changes state calls `AuditService.log()` (Module 002, reused, not
duplicated) — organization create/update/rename/archive/restore/delete, every membership
transition, every invitation lifecycle event. Separately, every membership-affecting action
also writes to `OrganizationMembershipEventRepository` — the two are deliberately not the same
call: `AuditLog` is the platform security trail, `OrganizationMembershipEvent` is the
product-facing timeline (ADR-005). A role change produces one audit log entry and one
membership event; a domain analytics feature that needs "show this member's history" should
never need to filter `AuditLog` by string-matching action names.

## 6. `docs/ARCHITECTURE_DECISIONS.md`

Created as requested. Nine entries (ADR-001 through ADR-009) consolidating decisions made
across Module 002 integration and all of Module 003 so far — tenant boundary, RBAC/org-role
separation, permanent slugs, defense-in-depth ownership enforcement, membership history,
repository/transaction boundaries, Profile-extension-not-duplication, token-hashing reuse, and
the Billing extension points. Each entry is a short summary linking back to the module doc with
full reasoning, per your instruction to keep it small.

## 7. Domain Exceptions

Added to `@rmsm/shared` (additive, alongside Module 002's existing `NotFoundError`/
`ValidationError`/`UnauthorizedError`):
- **`ForbiddenError`** (403) — authenticated but not permitted; will be used by Phase 4's
  `OrganizationRoleGuard`.
- **`ConflictError`** (409) — valid input that can't be applied against current state: slug
  already taken, last-Owner protection, invitation already pending, cancelling a
  non-`PENDING` invitation, etc. Every one of Decision 1's "never expose an intermediate
  invalid state" checks throws this.

## 8. Verification — What Actually Ran

| Check | Result |
|---|---|
| Lint (`@rmsm/api`) | ✅ 0 errors |
| Lint (`@rmsm/shared`) | ✅ 0 errors |
| `@rmsm/shared` typecheck + tests | ✅ clean; **11/11** tests (3 new for `slug.ts`) |
| `@rmsm/api` typecheck | ✅ 0 errors — against an extended verification stub (see below) |
| Existing unit tests (21) | ✅ unaffected |
| New `membership.service.spec.ts` (5 tests) | ⚠️ Written, correct, but blocked at import time — see below |

**A real bug in my verification tooling, found and fixed this phase.** My type-stub (used
since the TS2742 fix to prove typecheck correctness without a real Prisma client) declared
Prisma's enums using TypeScript's `enum` keyword. Real Prisma-generated enums are actually a
`const` object plus a derived string-literal union type — structurally very different from a
TS `enum`, which is nominal. This meant my stub was *silently more permissive* in one direction
in earlier verifications (any model delegate typed `any` swallowed argument checking entirely)
and *silently stricter* in this one (enum parameters rejected valid string literals that real
Prisma accepts). Phase 3 was the first phase to call repository methods with explicitly
enum-typed parameters from a *different file* (not passing straight into an `any`-typed
`prisma.x.create()` call), which is what exposed it. I fixed the stub to match Prisma's actual
codegen pattern, re-ran, and got zero errors — then went back and audited Module 002 for the
same masked-check risk (grepped for enum-typed parameters, found exactly one, confirmed its two
call sites never pass an explicit status and so were never at risk). I'm not aware of a way to
have caught this without hitting it, but I'd rather explain exactly what happened and what I
checked afterward than gloss over it.

**Separately, a real code fix, not a stub fix**: all three `prisma.$transaction(async (tx) =>
{...})` callbacks now explicitly type `tx: Prisma.TransactionClient` rather than relying on
contextual inference — correct regardless of any stub, and it's what surfaced as
"implicit-any" errors that led me to notice the enum issue in the first place.

**The new test's import-time failure is the same known limitation as `health.controller.spec.ts`,
nothing new**: any file importing `@rmsm/database` transitively runs
`packages/database/src/index.ts`'s top-level `new PrismaClient(...)`, which fails until
`generate` has produced a real client somewhere with normal network access. The test itself
imports `OrganizationMembershipService`, which imports `@rmsm/database` for its type
annotations — there's no way to unit-test a service without importing it. This will pass
without any code change once `prisma generate` succeeds on a real machine; I'm not claiming it
passes today.

## 9. Explicit Non-Scope for This Phase

No controllers, DTOs, guards, or Swagger — Phase 4. No scheduler/cron wiring for
`expireOverdueInvitations()` — the method exists and is correct; triggering it periodically is
infrastructure that belongs with whatever job-scheduling approach the platform settles on
(BullMQ is already wired for queues in Module 001's `QueueModule` — a recurring job is the
natural fit, deferred rather than guessed at here).

---

## Approval Checklist

- [ ] `OrganizationService` reviewed
- [ ] `OrganizationMembershipService` reviewed, especially the transfer-ownership
      re-verification-inside-transaction pattern
- [ ] `OrganizationInvitationService` reviewed
- [ ] `ARCHITECTURE_DECISIONS.md` reviewed
- [ ] Hand-written SQL migration + runbook reviewed
- [ ] Acknowledged: the new unit test and all DB-dependent verification still need a real
      Prisma client, same as every prior phase

**Awaiting your review before Phase 4 (Guards, Decorators, organization-scoped
authorization).**
