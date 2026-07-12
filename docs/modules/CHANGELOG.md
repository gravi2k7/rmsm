# Changelog — Module 003

## Phase 5

### Added
- 9 new e2e test suites (77 test cases) under `apps/api/test/`: organization lifecycle,
  membership lifecycle, authorization matrix, validation rules, concurrency, database
  integrity, API contract, security, performance
- Test infrastructure: `UserFactory`, `OrganizationFactory`, `MembershipFactory`,
  `InvitationFactory`, `AuthHelper` (authenticated/unprivileged test actors),
  `PermissionHelper` (platform role grants), `TestDatabaseSeeder` (cleanup + reference-data
  assertion)
- `docs/modules/TEST_COVERAGE.md`, `API_TEST_MATRIX.md`, `PHASE5_IMPLEMENTATION.md`,
  `FILES_CHANGED.md` (Phase 5 section), `TEST_RESULTS.md` (Phase 5 section)

### Changed
None. Per the prompt's explicit "DO NOT modify Prisma schema / repositories / services /
controllers / DTOs," this phase adds test code and test infrastructure only. No application
file was touched.

### Fixed
- `PermissionHelper.grantPlatformRole()` was initially written using `prisma.userRole.upsert()`
  on the `userId_roleId_tenantId` compound key — the exact Prisma 5.22 nullable-compound-key
  limitation already fixed once in `RbacService.assignRole` (Module 002) and again in the
  TS2742-regression fix (Phase 4 follow-up). Caught during this phase's own authoring — not by
  a failing test, since none could run here — and replaced with the same `findFirst` +
  conditional `create` pattern used in both prior fixes, before it could ship as a third
  instance of the same bug.

### Known Gaps
See `API_TEST_MATRIX.md`'s "Known Gaps" section for full detail: no dedicated happy-path test
for Decline/Cancel/Expire Invitation (endpoints exist from Phase 4, exercised indirectly); and
sorting is not implemented in `OrganizationSearchDto`/`OrganizationRepository.findMany()` — a
real Phase 4 feature gap, not a test-writing gap, not fixed here since doing so would modify a
DTO/repository this phase is told not to touch.

---

# Changelog — Module 003, Phase 4

## Added
- `OrganizationController` — create, get, update, soft-delete, restore, archive, list/search, update settings
- `MembershipController` — invite, accept/decline (token-based), list/get members, update role, suspend, reactivate, remove, leave, transfer ownership, cancel invitation
- `InvitationController` — validate (public), list, get, resend, expire
- `OrganizationStatisticsController` — member/invitation/role counts per organization
- `OrganizationRoleGuard` + `@RequireOrgRole()` decorator — new authorization layer answering "does this user hold a sufficient role in *this* organization," distinct from and complementary to Module 002's platform-wide `PermissionsGuard`. This is the guard Phase 1's ADR-002 said Phase 4 would need to build.
- `@CurrentOrgMembership()` param decorator
- 9 DTOs: `CreateOrganizationDto`, `UpdateOrganizationDto`, `OrganizationSettingsDto`, `OrganizationSearchDto`, `PaginationDto`, `InviteMemberDto`, `UpdateMemberRoleDto`, `TransferOwnershipDto`, plus a small supporting `InvitationTokenDto` for the token-based endpoints
- `OrganizationStatisticsService` — new, read-only, composes existing repository methods
- 10 new platform-tier permission keys (`organization.*`) seeded, with role grants — see `seed.ts` and the tier-gating judgment call documented in `PHASE4_IMPLEMENTATION.md`

## Changed (all additive — no existing method body was altered)
- `OrganizationMembershipRepository`: `+countByStatus()`, `+findByIdWithUser()`
- `OrganizationInvitationRepository`: `+countPendingByOrganization()`
- `OrganizationInvitationService`: `+validateToken()`, `+expireInvitation()`, `+getInvitation()`
- `OrganizationMembershipService`: `+listOrganizationsForUser()`, `+getMember()`
- `OrganizationsModule`: registered the 4 new controllers and 2 new providers
- `packages/database/prisma/seed.ts`: added `organization.*` permission keys and role grants

## Fixed
- `membership.service.spec.ts` (written in Phase 3): removed 3 `as any` casts that violated the "no any" rule — undetected in Phase 3 because the file was added after that phase's lint check had already run. Fixing the casts properly (typed partial mocks) then surfaced a second, real gap: the mock `OrganizationMembership` fixtures were missing four required fields, previously hidden by the same `any` casts. Both fixed; see `PHASE4_IMPLEMENTATION.md` for the full account.

## Not Changed
Every Phase 1–3 file not listed above is untouched. No Prisma schema change. No modification to Module 001 or Module 002 files. No repository or service method body was rewritten — every "Changed" entry above is a new method added alongside existing ones.
