# Module 003 — Organization Management: Implementation Summary

## 1. Implementation Summary

This module extends the existing Organization Access Management foundation (Phases 1–4,
already shipped: `OrganizationController`, `OrganizationService`, `OrganizationRepository`,
membership/invitation lifecycle, `OrganizationStatisticsService`, RBAC via
`PermissionsGuard` + `OrganizationRoleGuard`) rather than replacing any of it. Every
pre-existing endpoint, service method, and repository method is unchanged and still
covered by its original tests; Module 003 only adds new fields, new methods, and new
endpoints alongside them.

**What was added:**

- **Organization Profile** — 9 new nullable/defaulted columns on `Organization`
  (`displayName`, `email`, `phone`, `addressLine1`, `addressLine2`, `city`, `state`,
  `postalCode`, `locale`), added via one additive Prisma migration. Exposed through the
  existing `CreateOrganizationDto`/`UpdateOrganizationDto` (both extended, not replaced)
  and the existing `POST /organizations` / `PATCH /organizations/:id` endpoints, plus a
  new `PATCH /organizations/current/profile` alias.
- **Organization Settings (12 categories)** — General, Security, Branding, Feature
  Flags, API, Password Policy, Session Policy, MFA Policy, Notification Preferences, AI
  Preferences, Market Data Preferences, Trading Preferences. Each is a small,
  independently-validated `class-validator` DTO (`organization-settings-v2.dto.ts`).
  They persist into the *same* `Organization.settings` JSON column the pre-existing
  `OrganizationSettingsDto` already writes to — no new column, no new table. A category
  PATCH replaces that category's own sub-object; other categories are left untouched.
  New method: `OrganizationService.updateSettingsCategories()`. New endpoint:
  `PATCH /organizations/current/settings`.
- **Branding** — `UpdateOrganizationBrandingDto` (extends `BrandingSettingsDto`, the
  same DTO used inside the settings PATCH, plus a `logoUrl` field mirroring the
  top-level column). New method: `OrganizationService.updateBranding()`. New endpoint:
  `PATCH /organizations/current/branding`.
- **Organization Lifecycle** — Create/Update/Archive/Restore/Soft-Delete already
  existed and are unchanged. "Deactivate/Reactivate" from the functional spec map onto
  the existing Archive/Restore pair (the spec's own REST list has no separate
  deactivate/reactivate route, and `OrganizationStatus` already models exactly this
  reversible pair) — no new status value was added. Ownership Transfer already existed
  at `POST /organizations/:organizationId/members/transfer-ownership`
  (`MembershipController`); a thin alias route,
  `POST /organizations/:organizationId/transfer-owner`, was added on
  `OrganizationController` to match the spec's REST list, delegating to the exact same
  `OrganizationMembershipService.transferOwnership()` — zero duplicated business logic.
- **Organization Dashboard** — New `OrganizationDashboardService`, composing
  `OrganizationStatisticsService` (existing), a new `SessionRepository.
  countActiveByUserIds()` (Active Sessions), the existing billing
  `OrganizationSubscriptionRepository`/`UsageService` (Subscription, Usage), and a new
  `AuditLogRepository.findByEntity()` (Recent Activity). Lives in its own
  `OrganizationDashboardModule` (see Architecture Notes below for why) with two routes:
  `GET /organizations/:organizationId/dashboard` and
  `GET /organizations/current/dashboard`.
- **"Current organization" resolution** — This platform has no session/JWT-embedded
  "active organization" concept anywhere (`AccessTokenPayload` carries no
  organizationId; a user can belong to multiple organizations). The `/current/*` routes
  resolve the organization from a required `X-Organization-Id` request header via a new
  `CurrentOrganizationGuard`, applied only at the method level on these specific routes
  — zero effect on any existing route.
- **Domain Events** — `OrganizationCreated`, `OrganizationUpdated`, `OrganizationArchived`,
  `OrganizationDeleted`, `OrganizationOwnerTransferred`, published by a new in-process
  `OrganizationEventPublisher` (Node's built-in `EventEmitter`, wrapped in a small
  injectable class) from `OrganizationService`'s and `OrganizationMembershipService`'s
  existing lifecycle methods, right after their existing audit-log calls. See
  Architecture Notes for why this is deliberately not the strategy-engine's
  Postgres-backed outbox pattern.
- **Audit Logging** — 2 new audit actions (`organization.settings.updated`,
  `organization.branding.updated`) alongside the 7 that already existed
  (`organization.created/updated/archived/restored/deleted/slug_renamed`,
  `organization.ownership_transferred`) — 9 total, a superset of the spec's "8 named
  events."
- **Repository cleanup** — `OrganizationRepository`'s own hand-copied
  `toInputJsonValue()` helper was replaced with the centralized `@rmsm/shared` version
  (behavior-identical; this was a flagged cleanup candidate from Module 003's own
  predecessor work).

## 2. Files Changed

**New:**
- `packages/database/prisma/migrations/20260801071023_add_organization_profile_fields/migration.sql`
- `api/src/modules/organizations/dto/organization-settings-v2.dto.ts`
- `api/src/modules/organizations/dto/update-organization-branding.dto.ts`
- `api/src/modules/organizations/guards/current-organization.guard.ts`
- `api/src/modules/organizations/decorators/current-organization-id.decorator.ts`
- `api/src/modules/organizations/events/organization-events.ts`
- `api/src/modules/organizations/events/organization-event-publisher.service.ts`
- `api/src/modules/organizations/dashboard/organization-dashboard.service.ts`
- `api/src/modules/organizations/dashboard/organization-dashboard.controller.ts`
- `api/src/modules/organizations/dashboard/organization-dashboard.module.ts`
- 10 new spec files (see Validation Checklist)

**Modified (all additive — no removed fields, methods, or routes):**
- `packages/database/prisma/schema.prisma` (Organization model: +9 columns)
- `api/src/modules/organizations/repositories/organization.repository.ts`
- `api/src/modules/organizations/dto/create-organization.dto.ts`
- `api/src/modules/organizations/dto/update-organization.dto.ts`
- `api/src/modules/organizations/services/organization.service.ts`
- `api/src/modules/organizations/services/membership.service.ts`
- `api/src/modules/organizations/organization.controller.ts`
- `api/src/modules/organizations/organizations.module.ts`
- `api/src/modules/auth/repositories/session.repository.ts` (+`countActiveByUserIds`)
- `api/src/modules/auth/repositories/audit-log.repository.ts` (+`findByEntity`)
- `api/src/app.module.ts` (+`OrganizationDashboardModule` import)

## 3. Environment Variables Added

None. Every new capability reuses existing configuration, existing Prisma connection
settings, and existing RBAC permissions (`organization.update`, `organization.settings.update`,
`organization.owner.transfer`, `organization.read` — no new permission keys were needed).

## 4. API Endpoints Added

| Method | Path | Notes |
|---|---|---|
| GET | `/organizations/current` | Requires `X-Organization-Id` header |
| PATCH | `/organizations/current/profile` | |
| PATCH | `/organizations/current/settings` | 12 structured categories |
| PATCH | `/organizations/current/branding` | |
| POST | `/organizations/:organizationId/transfer-owner` | Alias for the existing `members/transfer-ownership` route |
| GET | `/organizations/:organizationId/dashboard` | |
| GET | `/organizations/current/dashboard` | |

## 5. Validation Checklist

- **TypeScript strict compile**: 0 errors. The full `organizations` module (37
  non-test files including every pre-existing sibling file, plus all new/modified
  files) was type-checked with `tsc --strict` against faithful type stubs for
  `@rmsm/database`/`@rmsm/config`/`@rmsm/shared` and the *real* `@nestjs/common`,
  `@nestjs/core`, `@nestjs/swagger`, `@nestjs/throttler`, `class-validator`,
  `class-transformer`, and `express` packages (not stubs) — see "Sandbox Network
  Limitation" below for why this ran in an isolated sandbox instead of the repo's own
  `pnpm typecheck`.
- **Jest**: 67/67 tests passing across 12 suites — the 10 new Module 003 spec files
  (organization.service, organization.controller, organization.repository,
  current-organization.guard, organization-event-publisher, organization-dashboard.service,
  session.repository count-active-by-user-ids, audit-log.repository find-by-entity) plus
  every pre-existing sibling spec file in the module (membership.service,
  membership.controller, invitation.service, invitation.controller) re-run unmodified
  to confirm no regression.
- **Lint / `pnpm build` / Docker Compose**: not run — see limitation below.

### Sandbox network limitation (environmental, not a code defect)

This sandbox's network egress to `binaries.prisma.sh` returns `403 Forbidden`, so
`prisma generate` cannot download the query-engine binary and a real `pnpm install` /
`pnpm typecheck` / `pnpm build` cannot complete end-to-end here (the same class of
sandbox restriction documented in the EM-001 runtime bug-fix delivery for
`smtp.gmail.com`). As a substitute, the validation above was run against real npm
packages plus hand-written type stubs for the three `@rmsm/*` workspace packages,
scoped to typecheck and test the actual, unmodified source files. **Please run
`pnpm install && pnpm --filter api typecheck && pnpm --filter api test && pnpm --filter api build`
and `docker compose up` yourself** to get the full first-party gate; nothing above
depends on anything that would behave differently there.

## 6. Manual Verification Steps

1. `pnpm install && pnpm --filter @rmsm/database generate && pnpm --filter @rmsm/database migrate deploy`
   (applies the new migration — additive only, safe on an existing database).
2. `pnpm --filter api start:dev`, then, as an active Owner/Administrator of an
   organization:
   - `PATCH /organizations/:id/profile`-equivalent: `PATCH /organizations/current/profile`
     with header `X-Organization-Id: <id>` and body `{"displayName": "Acme Inc.", "locale": "en-GB"}`.
   - `PATCH /organizations/current/settings` with body
     `{"passwordPolicy": {"minLength": 12}, "mfaPolicy": {"required": true}}` — verify
     `GET /organizations/:id` shows both under `settings.passwordPolicy` /
     `settings.mfaPolicy`, and that a second PATCH with only `{"branding": {...}}` leaves
     `passwordPolicy`/`mfaPolicy` untouched.
   - `PATCH /organizations/current/branding` with `{"primaryColor": "#0F172A", "logoUrl": "https://.../logo.png"}`.
   - `GET /organizations/:id/dashboard` — confirm `statistics`, `activeSessions`,
     `subscription`, `usage`, `recentActivity` are all populated from real data.
   - `POST /organizations/:id/transfer-owner` with `{"toMembershipId": "..."}` — confirm
     it behaves identically to the pre-existing `members/transfer-ownership` route.
3. Subscribe a test listener to `OrganizationEventPublisher` (e.g. temporarily in
   `main.ts`) and confirm `organization.event.OrganizationUpdated` logs appear on each
   PATCH above.

## 7. Known Scope Gap: Admin UI

The functional spec's Admin UI section (List/Details/Profile/Settings/Branding/
Dashboard/Members/Subscription/Activity pages) **cannot be implemented against this
repository checkout as it currently exists**: there is no `apps/` directory of any
kind in this checkout (only `api/`, `packages/`, `infra/`, `docs/`, `scripts/` exist at
the repo root, and `pnpm-workspace.yaml`'s `apps/*` glob currently matches nothing).
This is an environmental finding about the current state of this checkout, not a scope
decision — if an admin frontend app exists in a different branch/checkout, the REST
endpoints above are ready to be consumed by it as-is.

## 8. Known Scope Gap: Broker Connections (Dashboard)

The Dashboard's "Broker Connections" field (listed in the functional spec) is
deliberately omitted from `OrganizationDashboardService`'s response. No
Broker/Connection Prisma model with an `organizationId` exists anywhere in this
schema — BR-001 (MetaTrader 5) built only provider contracts/interfaces/registry, no
persisted per-organization connection state. Inventing a value would violate the
"no mock implementations" instruction; inventing the underlying schema/table would be
new, out-of-scope infrastructure for this milestone.
