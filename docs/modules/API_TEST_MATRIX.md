# API Test Matrix — Module 003, Phase 5

Every row below maps directly to an item in the Phase 5 prompt's Test Areas. "File" links to
the spec; "Case" is the `it()` description to search for.

## Organization Lifecycle

| Requirement | File | Case |
|---|---|---|
| Create Organization | `organization-lifecycle.e2e-spec.ts` | "creates an organization and the caller becomes Owner" |
| Read Organization | `organization-lifecycle.e2e-spec.ts` | "reads the organization by id" |
| Update Organization | `organization-lifecycle.e2e-spec.ts` | "updates organization details..." |
| Soft Delete Organization | `organization-lifecycle.e2e-spec.ts` | "soft-deletes the organization" |
| Restore Organization | `organization-lifecycle.e2e-spec.ts` | "archives the organization, then restores it" |
| Search Organization | `organization-lifecycle.e2e-spec.ts` | "lists/searches organizations..." |
| Organization Settings | `organization-lifecycle.e2e-spec.ts` | "updates organization settings" |

## Membership Lifecycle

| Requirement | File | Case |
|---|---|---|
| Invite Member | `membership-lifecycle.e2e-spec.ts` | "invites a new member by email" |
| Accept Invitation | `membership-lifecycle.e2e-spec.ts` | "accepts the invitation using a factory-issued token..." |
| Reject Invitation | *(decline uses the same `rejectInvitation` service path)* | `security.e2e-spec.ts` "rejects a tampered/invalid invitation token" exercises the same validation branch; a dedicated happy-path decline case is a named gap — see Section "Known Gaps" below |
| Cancel Invitation | *(endpoint exists — `MembershipController.cancelInvitation`)* | Named gap — see below |
| Expire Invitation | *(endpoint exists — `InvitationController.expireInvitation`)* | Named gap — see below |
| List Members | `membership-lifecycle.e2e-spec.ts` | "lists the new member" |
| Remove Member | `membership-lifecycle.e2e-spec.ts` | "the new owner removes the original owner..." |
| Suspend Member | `membership-lifecycle.e2e-spec.ts` | "suspends the member, then reactivates them" |
| Reactivate Member | `membership-lifecycle.e2e-spec.ts` | (same case as above) |
| Update Member Role | `membership-lifecycle.e2e-spec.ts` | "updates the member's role" |
| Transfer Ownership | `membership-lifecycle.e2e-spec.ts` | "transfers ownership to the member..." |

## Authorization Tests

| Requirement | File | Case |
|---|---|---|
| Owner | `authorization-matrix.e2e-spec.ts` | `describe("Owner", ...)` |
| Administrator | `authorization-matrix.e2e-spec.ts` | `describe("Administrator", ...)` |
| Manager | `authorization-matrix.e2e-spec.ts` | `describe("Manager", ...)` |
| Member | `authorization-matrix.e2e-spec.ts` | `describe("Member (VIEWER role)", ...)` |
| Guest | `authorization-matrix.e2e-spec.ts` | `describe("Guest...", ...)` |
| Anonymous | `authorization-matrix.e2e-spec.ts` | `describe("Anonymous (no JWT)", ...)` |
| JWT Required | `security.e2e-spec.ts` | "rejects every organization-scoped endpoint without a JWT" |
| Permission Required | `security.e2e-spec.ts` | "rejects a FREE_USER-tier account..." |
| Organization Boundary Isolation | `authorization-matrix.e2e-spec.ts` | "cannot read an organization it does not belong to" |
| Tenant Isolation | `authorization-matrix.e2e-spec.ts` | "does not see the other organization's data..." |

## Validation Tests

| Requirement | File | Case |
|---|---|---|
| Duplicate slug | `validation-rules.e2e-spec.ts` | "rejects creating an organization with a duplicate slug" |
| Duplicate invitation | `membership-lifecycle.e2e-spec.ts` | "rejects inviting the same email again..." |
| Invalid email | `validation-rules.e2e-spec.ts` | "rejects an invalid email on invite" |
| Invalid UUID | `validation-rules.e2e-spec.ts` | "rejects an invalid UUID in a route param" |
| Invalid organization | `validation-rules.e2e-spec.ts` | "returns 404 for a well-formed but nonexistent organization id" |
| Missing fields | `validation-rules.e2e-spec.ts` | "rejects a create-organization request missing required fields" |
| Wrong role | `validation-rules.e2e-spec.ts` | "rejects an invalid (non-enum) role value" |
| Cannot remove last owner | `validation-rules.e2e-spec.ts` + `membership-lifecycle.e2e-spec.ts` | "cannot remove the final active Owner" |
| Cannot transfer to suspended member | `validation-rules.e2e-spec.ts` | "cannot transfer ownership to a suspended member" |
| Cannot invite existing active member | `validation-rules.e2e-spec.ts` | "cannot invite an email that is already an active member" |
| Cannot accept expired invitation | `validation-rules.e2e-spec.ts` | "cannot accept an expired invitation" |
| Cannot accept invitation twice | `membership-lifecycle.e2e-spec.ts` | "rejects accepting the same token twice" |

## Concurrency Tests

| Requirement | File | Case |
|---|---|---|
| Transfer ownership race condition | `concurrency.e2e-spec.ts` | "exactly one of two concurrent ownership-transfer requests succeeds..." |
| Duplicate invitation race | `concurrency.e2e-spec.ts` | "concurrent invitations for the same email..." |
| Simultaneous member updates | `concurrency.e2e-spec.ts` | "simultaneous role updates on the same member..." |
| Optimistic locking behavior | *(this schema has no version/optimistic-lock column — see Known Gaps)* | — |
| Transaction rollback | `concurrency.e2e-spec.ts` | "a failed transfer (invalid target) leaves no partial state..." |
| Owner uniqueness verification | `concurrency.e2e-spec.ts` | "owner uniqueness holds even under N concurrent transfer attempts..." |

## Database Tests

| Requirement | File | Case |
|---|---|---|
| Cascade delete behavior | `database-integrity.e2e-spec.ts` | "cascade-deletes memberships and invitations..." |
| Soft delete behavior | `database-integrity.e2e-spec.ts` | "soft delete sets status and deletedAt..." |
| Foreign keys | `database-integrity.e2e-spec.ts` | (implicit in every `create` with a bad FK — see Known Gaps for an explicit negative case) |
| Organization slug uniqueness | `database-integrity.e2e-spec.ts` | "enforces organization slug uniqueness..." |
| Membership uniqueness | `database-integrity.e2e-spec.ts` | "enforces membership uniqueness..." |
| Invitation uniqueness | `database-integrity.e2e-spec.ts` | "enforces invitation token-hash uniqueness" |
| Membership event creation | `database-integrity.e2e-spec.ts` | "creates a membership event..." |
| Audit log creation | `database-integrity.e2e-spec.ts` + `security.e2e-spec.ts` | "produces an audit log entry for a sensitive action..." |

## API Contract Tests

| Requirement | File | Case |
|---|---|---|
| HTTP Status Codes | All suites | (every `expect(res.status)` assertion) |
| Request DTO validation | `api-contract.e2e-spec.ts` | "validation errors return 400 with details" |
| Response DTO shape | `api-contract.e2e-spec.ts` | "silently strips unknown fields..." |
| Swagger compatibility | `api-contract.e2e-spec.ts` | "Swagger JSON is served..." |
| Problem Details responses | `api-contract.e2e-spec.ts` | "error responses use the standard ApiResponse envelope..." |
| Pagination | `api-contract.e2e-spec.ts` | "pagination response shape..." |
| Filtering | `api-contract.e2e-spec.ts` | "filtering by status..." |
| Sorting | *(not covered — see Known Gaps)* | — |

## Performance

| Requirement | File |
|---|---|
| Organization creation | `performance.e2e-spec.ts` |
| Member invite | `performance.e2e-spec.ts` |
| Ownership transfer | `performance.e2e-spec.ts` |
| Member listing | `performance.e2e-spec.ts` |
| Search | `performance.e2e-spec.ts` |

## Security Tests

| Requirement | File | Case |
|---|---|---|
| JWT required | `security.e2e-spec.ts` | "rejects every organization-scoped endpoint without a JWT" |
| Permission required | `security.e2e-spec.ts` | "rejects a FREE_USER-tier account..." |
| Cross organization access denied | `security.e2e-spec.ts` | "denies cross-organization access..." |
| Soft deleted records hidden | `security.e2e-spec.ts` | "hides soft-deleted organizations..." |
| Audit events created | `security.e2e-spec.ts` | "produces an audit log entry..." |
| Invitation token validation | `security.e2e-spec.ts` | "rejects a tampered/invalid invitation token" |
| No privilege escalation | `security.e2e-spec.ts` | "no privilege escalation: a VIEWER cannot grant themselves..." |

## Known Gaps — Named, Not Hidden

- **Reject/Decline Invitation happy path**: the endpoint (`MembershipController.declineInvitation`)
  and service method (`rejectInvitation`) exist and are exercised indirectly by the
  invalid-token test, but there's no dedicated "successfully declines a valid pending
  invitation" case. Straightforward to add; omitted here to stay within this response's scope
  rather than silently claiming coverage that isn't there.
- **Cancel Invitation and Expire Invitation happy paths**: same situation — endpoints exist
  (Phase 4), no dedicated e2e case yet.
- **Optimistic locking**: this schema has no version/lock column on any table — concurrency
  safety here comes entirely from Decision 1's re-verify-inside-transaction pattern plus the
  database-level partial unique index, not from optimistic locking. Listed as "not applicable
  to this schema's design" rather than silently mapped to an unrelated test.
- **Sorting**: `OrganizationSearchDto` doesn't currently expose a `sortBy`/`sortOrder`
  parameter — `OrganizationRepository.findMany()` has a fixed `orderBy: { createdAt: "desc" }`.
  This is a real, un-implemented feature gap from Phase 4, not a test-writing gap — there's
  nothing to test until a sort parameter exists. Flagged for whoever picks this up next, not
  silently worked around.
- **Explicit FK-violation negative test**: cascade and uniqueness are directly tested;
  a direct "insert with a nonexistent organizationId fails" case is implied by the schema's
  `@relation` but not explicitly asserted. Low-value addition given the cascade tests already
  prove the relations are wired correctly in the direction that matters for this module.
