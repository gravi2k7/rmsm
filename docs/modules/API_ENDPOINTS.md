# API Endpoints — Module 003, Phase 4

All routes are under the global `/api/v1` prefix (Module 001). "Platform perm" is checked by
Module 002's `PermissionsGuard`; "Org role" is checked by the new `OrganizationRoleGuard` — an
endpoint with both requires ALL of: valid JWT, the listed platform permission, AND active
membership with one of the listed organization roles. See `ARCHITECTURE_DECISIONS.md` ADR-002/
ADR-010 for why both layers exist.

## OrganizationController (`/organizations`)

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| POST | `/organizations` | `organization.create` | — | Create organization; caller becomes Owner |
| GET | `/organizations` | `organization.read` | — | List/search organizations the caller belongs to |
| GET | `/organizations/:organizationId` | `organization.read` | any active | Get organization |
| PATCH | `/organizations/:organizationId` | `organization.update` | OWNER, ADMINISTRATOR | Update details (not slug/status) |
| PATCH | `/organizations/:organizationId/settings` | `organization.settings.update` | OWNER, ADMINISTRATOR | Replace settings JSON |
| DELETE | `/organizations/:organizationId` | `organization.delete` | OWNER | Soft delete |
| POST | `/organizations/:organizationId/archive` | `organization.delete` | OWNER | Archive (reversible) |
| POST | `/organizations/:organizationId/restore` | `organization.restore` | OWNER | Restore from archived |

## MembershipController

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| POST | `/organizations/invitations/accept` | — (authenticated) | — | Accept invitation by token |
| POST | `/organizations/invitations/decline` | — (public) | — | Decline invitation by token |
| GET | `/organizations/:organizationId/members` | `organization.read` | any active | List active members |
| GET | `/organizations/:organizationId/members/:membershipId` | `organization.read` | any active | Get one member |
| POST | `/organizations/:organizationId/members/invite` | `organization.member.invite` | OWNER, ADMINISTRATOR, MANAGER | Invite by email |
| PATCH | `/organizations/:organizationId/members/:membershipId/role` | `organization.member.update` | OWNER, ADMINISTRATOR | Change role (never to/from OWNER) |
| POST | `/organizations/:organizationId/members/:membershipId/suspend` | `organization.member.update` | OWNER, ADMINISTRATOR | Suspend member |
| POST | `/organizations/:organizationId/members/:membershipId/reactivate` | `organization.member.update` | OWNER, ADMINISTRATOR | Reactivate member |
| DELETE | `/organizations/:organizationId/members/:membershipId` | `organization.member.remove` | OWNER, ADMINISTRATOR | Remove member |
| POST | `/organizations/:organizationId/members/leave` | `organization.read` | any active | Self-leave |
| POST | `/organizations/:organizationId/members/transfer-ownership` | `organization.owner.transfer` | OWNER | Transfer ownership |
| POST | `/organizations/:organizationId/invitations/:invitationId/cancel` | `organization.member.invite` | OWNER, ADMINISTRATOR, MANAGER | Cancel pending invitation |

## InvitationController

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `/organizations/invitations/validate?token=` | — (public) | — | Check token validity without consuming it |
| GET | `/organizations/:organizationId/invitations` | `organization.read` | OWNER, ADMINISTRATOR, MANAGER | List pending invitations |
| GET | `/organizations/:organizationId/invitations/:invitationId` | `organization.read` | OWNER, ADMINISTRATOR, MANAGER | Get one invitation |
| POST | `/organizations/:organizationId/invitations/:invitationId/resend` | `organization.member.invite` | OWNER, ADMINISTRATOR, MANAGER | Resend with fresh token |
| POST | `/organizations/:organizationId/invitations/:invitationId/expire` | `organization.member.invite` | OWNER, ADMINISTRATOR, MANAGER | Force-expire immediately |

## OrganizationStatisticsController

| Method | Path | Platform perm | Org role | Summary |
|---|---|---|---|---|
| GET | `/organizations/:organizationId/statistics` | `organization.read` | OWNER, ADMINISTRATOR, MANAGER | Member/invitation/role counts |

## Design notes worth being explicit about

- **`GET /organizations` is intentionally tenant-scoped**, not a platform-wide list of every
  organization. See the code comment on `OrganizationController.listOrganizations()` — an
  unscoped list would leak cross-tenant data. Platform-wide oversight belongs to a future SaaS
  Administration module with its own dedicated permission.
- **`InviteMemberDto` and `UpdateMemberRoleDto` both exclude `OWNER`** from their allowed role
  values — ownership only moves through the dedicated transfer-ownership endpoint, which
  requires the target to already be an active member (Decision 1).
- **Accept requires authentication; Decline does not** — accepting needs to know *which* user's
  membership to create/reactivate and requires their email to match the invitation; declining
  is a pure "no thank you" that only needs the token, matching Module 002's `verify-email`
  pattern of leaving token-only, non-account-mutating actions public.
- Full request/response shapes are in the DTOs and Swagger (`/api/docs`) — not duplicated here
  to avoid the two going out of sync.
