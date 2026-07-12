import { SetMetadata } from "@nestjs/common";
import type { OrganizationRole } from "@rmsm/database";

export const ORG_ROLES_KEY = "orgRoles";

/**
 * Restricts an endpoint to callers whose ACTIVE OrganizationMembership role
 * (within the :organizationId in the route) is one of the given roles.
 * Distinct from Module 002's @Roles() (platform RBAC) — this checks a
 * per-organization membership row, not a JWT-embedded claim. See
 * OrganizationRoleGuard and ADR-002/ADR-010.
 */
export const RequireOrgRole = (...roles: OrganizationRole[]) => SetMetadata(ORG_ROLES_KEY, roles);
