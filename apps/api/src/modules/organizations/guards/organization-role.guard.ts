import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError } from "@rmsm/shared";
import { ORG_ROLES_KEY } from "../decorators/require-org-role.decorator";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import type { AccessTokenPayload } from "../../auth/services/token.service";

/**
 * New guard, not a modification of Module 002's RolesGuard/PermissionsGuard
 * — this is the OrganizationRoleGuard promised in Phase 1's ADR-002 and
 * confirmed in the Phase-2 Review Response. Module 002's PermissionsGuard
 * answers "does this account tier have access to this feature at all"
 * (platform-wide, JWT-embedded, no organization context). This guard
 * answers the orthogonal question: "does this specific user hold a
 * sufficient role in THIS specific organization." Both apply together on
 * every organization-scoped write endpoint — omitting this guard and
 * relying on PermissionsGuard alone would let any user with a broadly-
 * granted platform permission act on organizations they aren't a member
 * of at all, which is a real cross-tenant authorization hole, not a
 * hypothetical one.
 *
 * Reads :organizationId from route params. If the route has no
 * :organizationId (e.g. token-based invitation accept/decline, which
 * carries its own authorization via the token), this guard passes through
 * — there is nothing for it to check.
 */
@Injectable()
export class OrganizationRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membershipRepository: OrganizationMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const organizationId: string | undefined = request.params?.organizationId;
    if (!organizationId) return true;

    const user: AccessTokenPayload | undefined = request.user;
    if (!user) return false;

    const membership = await this.membershipRepository.findByOrgAndUser(organizationId, user.sub);
    if (!membership || membership.status !== "ACTIVE") {
      throw new ForbiddenError("You are not an active member of this organization.");
    }
    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenError(`This action requires one of the following roles: ${requiredRoles.join(", ")}.`);
    }

    // Downstream handlers can read this without a second lookup.
    request.orgMembership = membership;
    return true;
  }
}
