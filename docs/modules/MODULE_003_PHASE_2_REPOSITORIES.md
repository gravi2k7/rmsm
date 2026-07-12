# Module 003 — User & Organization Management
## Phase 2: Repositories

Status: Complete — Awaiting Approval Before Phase 3 · Branch: `feature/module-003-user-organization`

Repositories only, per your instruction — "business logic only in services" means Phase 2
contains zero business rules, zero invariant enforcement, and zero multi-repository
orchestration. What it does contain: single-table data-access primitives, deliberately shaped
so that Phase 3 can build correct behavior on top of them and so that *incorrect* usage is, in
several places, a compile error rather than a runtime bug waiting to happen.

## 1. Schema Amendments (flagged, additive, none reopen what Phase 1 already covered)

Three changes were needed to actually satisfy this phase's engineering constraints — all
additive, none touching Module 001/002:

1. **`MembershipStatus` gained `REMOVED`.** Phase 1's schema doc said admin-removal would
   delete the membership row; your new "preserve membership history" constraint means that's
   no longer correct. Both self-departure (`LEFT`) and admin-removal (`REMOVED`) are now status
   transitions on a row that's never deleted. Rejoining reactivates the same row (its
   `[organizationId, userId]` uniqueness is preserved) rather than creating a duplicate.
2. **New `OrganizationMembershipEvent` model** (+ `MembershipEventAction` enum) — the actual
   history log. Deliberately separate from Module 002's `AuditLog`: `AuditLog` is a
   platform-wide security/compliance trail; this is a domain-specific, product-facing timeline
   ("member since," role-change history) that will be queried differently. Append-only by
   design — the repository built on it has no update/delete methods.
3. **`Organization` gained two reserved, unused columns**: `billingCustomerId` (unique,
   nullable) and `seatsLimit` (nullable) — the forward-compatible Subscription/Billing
   extension points you asked for. Nothing in Module 003 reads or writes either field.

Full current model/enum count: 20 models, 7 enums. Structural check performed (brace balance,
every named `@relation` present on both sides) — same honest caveat as Phase 1: this is not a
substitute for `prisma validate`, which is still blocked by this sandbox's network policy (see
Section 5).

## 2. Files Delivered

```
apps/api/src/modules/organizations/repositories/
├── organization.repository.ts
├── membership.repository.ts
├── membership-event.repository.ts
└── invitation.repository.ts

packages/database/src/index.ts   (extended: new payload types + DbClient alias)
packages/database/prisma/schema.prisma   (amended per Section 1)
```

No controllers, services, DTOs, guards, or tests in this phase — those are Phases 3–6.

## 3. The Transaction-Composition Pattern (how "use Prisma transactions for multi-table
operations" and "repository pattern with business logic only in services" are both satisfied
at once)

Every repository method's last parameter is `client: DbClient = prisma`, where `DbClient =
PrismaClient | Prisma.TransactionClient` (now exported from `@rmsm/database`). A repository
method never opens its own transaction and never calls another repository — it's a single-table
primitive that happens to accept either the global singleton or a transaction-scoped client.

Multi-table atomicity is entirely a **Phase 3 service** concern:

```ts
// Illustrative — this is Phase 3 code, not delivered yet.
await prisma.$transaction(async (tx) => {
  const org = await this.organizationRepository.create(input, tx);
  const owner = await this.membershipRepository.create({ organizationId: org.id, userId, role: "OWNER" }, tx);
  await this.membershipEventRepository.create({ organizationId: org.id, userId, action: "JOINED", newRole: "OWNER" }, tx);
  return org;
});
```

This is why `OrganizationRepository` has no `createWithOwner()` method and
`OrganizationMembershipRepository` has no `transferOwnership()` method, even though both are
named directly in your constraints — deciding *when* to run a multi-table transaction, and
what business rules must hold before it runs, is exactly the "business logic" the constraint
says belongs in services, not repositories. Phase 2's job was to make sure the primitives
compose cleanly when Phase 3 needs them to.

## 4. How Each Constraint Maps to What Was (and Wasn't) Built Here

| Constraint | Phase 2 (this phase) | Phase 3 (next) |
|---|---|---|
| Soft-delete organizations | `softDelete()` sets `status=DELETED, deletedAt=now`. **No hard-delete method exists on the repository at all** — the constraint is enforced by that method's absence, not a runtime check. | Authorization for who may call it |
| Immutable slugs except rename flow | `UpdateOrganizationDetailsInput` structurally excludes `slug` (compile error to include it); `renameSlug()` is the only method that touches the column | Slug format validation, uniqueness pre-check, rate-limiting renames |
| Preserve membership history | `OrganizationMembershipEvent` (append-only) + `MembershipStatus` amendment (Section 1) — rows are never deleted | Deciding *when* to write each event type |
| Exactly one active Owner | `findActiveOwner()` and `countActiveByRole()` — read primitives only. **Not enforced here** | The actual invariant check, before any role-changing call; see the flagged gap in Section 5 |
| Prisma transactions for multi-table ops | `DbClient` parameter on every method (Section 3) | Opening the actual `$transaction` blocks |
| Repository pattern, logic in services | Every method here is single-table, zero conditionals beyond "which status filter" | All business rules |
| Audit every mutation | N/A — repositories don't call `AuditService` (that would blur the boundary the same way a repository calling another repository would) | Every service method calls `AuditService.log()`, exactly like Module 002's `AuthService` already does |
| Forward-compatible Billing extension points | `billingCustomerId`, `seatsLimit` reserved columns (Section 1) | Not this module's job — future Billing module reads them |

## 5. Known Gaps — Flagged, Not Hidden

**"Exactly one active Owner" has no database-level guarantee.** Postgres doesn't support a
true partial/filtered unique index (`UNIQUE (organization_id) WHERE role = 'OWNER' AND status =
'ACTIVE'`) through Prisma's schema DSL — that requires hand-written SQL in a migration, which I
have not added. Right now, the invariant will be enforced entirely at the application layer in
Phase 3: verify-then-act inside a single `prisma.$transaction`, which closes the gap for
sequential requests but leaves a narrow race-condition window under concurrent requests (two
simultaneous "become owner" calls could theoretically both pass a pre-check before either
commits). Flagging this now, before Phase 3 is built on the assumption it's already solved.
Two honest options for Phase 3, not decided yet: (a) accept the small race window as
acceptable for this module's expected traffic pattern (ownership transfers are rare, human-
initiated actions), or (b) add a hand-written partial unique index via a manually-edited
migration SQL file. I'd like your input before Phase 3 picks one.

**Slug uniqueness after soft-delete.** `slug` carries a hard, non-partial `@unique` constraint.
A deleted organization's slug remains permanently unavailable to any other organization unless
a future decision explicitly releases it (e.g., appending a suffix on delete). Not resolved
here — flagged as a decision Phase 3's `OrganizationService.softDelete()` (or a dedicated
follow-up) needs to make consciously, not accidentally.

**Prisma tooling verification, same as every prior module.** `prisma validate`/`generate`/
`format` all remain blocked by this sandbox's network policy. What I verified instead: I
extended my hand-built type-stub (used for the TS2742 fix earlier) with all four new Module 003
models/enums and a properly-typed `Prisma.TransactionClient`, ran the full `apps/api` typecheck
against it, and got **zero errors on the first attempt** — a direct result of applying the
TS2742 return-type discipline from the start this time rather than retrofitting it. I also
caught and fixed the same `Record<string, unknown>` → `Prisma.InputJsonValue` issue in
`OrganizationMembershipEventRepository` proactively, before it could surface as a real error
later. Stub deleted after verification, as always — not part of the deliverable. Lint is clean
(0 errors) and all 21 existing unit tests still pass unaffected.

## 6. Acceptance Criteria for This Phase

- [x] Every repository method is single-table (no cross-model orchestration)
- [x] Every repository method has an explicit `Promise<T>` return type using named types from
      `@rmsm/database` (learned from the TS2742 fix — applied from the start, not retrofitted)
- [x] `OrganizationRepository` has no method capable of changing `slug` except `renameSlug()`
- [x] `OrganizationRepository` has no hard-delete method
- [x] `OrganizationMembershipEventRepository` has no update/delete methods (append-only)
- [x] Every method accepts an optional `DbClient` for transaction composition
- [x] Zero business rules/invariant enforcement in this phase (confirmed by review — no `if`
      branch in any repository method decides whether an operation is *allowed*, only which
      Prisma query shape to run)
- [x] Zero Module 001/002 files modified outside the flagged, additive `schema.prisma` changes
- [x] Lint clean, typecheck clean (verified against extended stub), existing tests unaffected

---

**Awaiting your review before Phase 3 (Services).** Beyond general approval, two decisions
would help me build Phase 3 correctly the first time rather than needing a revision:

1. **The "exactly one active Owner" race-condition gap (Section 5)** — accept the
   verify-then-act-in-a-transaction approach for now, or add a hand-written partial unique
   index?
2. **Slug reuse after soft-delete (Section 5)** — should a deleted organization's slug ever
   become available again, and if so, on what trigger (immediate, after a retention period, an
   explicit admin action)?
