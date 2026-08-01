import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError, ValidationError } from "@rmsm/shared";
import { ORG_ROLES_KEY } from "../decorators/require-org-role.decorator";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import type { AccessTokenPayload } from "../../auth/services/token.service";

/**
 * Resolves "the current organization" for the `/organizations/current/*`
 * routes (Module 003's REST surface). This platform has no session-level
 * or JWT-embedded "active organization" concept anywhere — `AccessTokenPayload`
 * carries no organizationId, and a user can belong to multiple
 * organizations (OrganizationMembershipRepository.findActiveByUser) — so
 * "current" cannot be resolved from the token alone the way `:organizationId`
 * route params are resolved by OrganizationRoleGuard.
 *
 * This guard resolves it from an `X-Organization-Id` request header
 * instead — a standard, unsurprising multi-tenant convention, and the
 * minimal mechanism that actually satisfies the requirement rather than
 * inventing a new session/JWT concept. It is applied ONLY at the method
 * level on the small number of `/current/*` routes (never controller-wide),
 * so it has zero effect on any existing route: this is purely additive.
 *
 * Deliberately reuses OrganizationRoleGuard's exact role-check logic
 * (same ORG_ROLES_KEY metadata via @RequireOrgRole, same
 * OrganizationMembershipRepository lookup, same ForbiddenError) rather
 * than introducing a second, divergent authorization implementation.
 */
@Injectable()
export class CurrentOrganizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly membershipRepository: OrganizationMembershipRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers?.["x-organization-id"];
    const organizationId = Array.isArray(header) ? header[0] : header;

    if (!organizationId || typeof organizationId !== "string") {
      throw new ValidationError("The X-Organization-Id header is required for /organizations/current/* endpoints.");
    }

    const user: AccessTokenPayload | undefined = request.user;
    if (!user) return false;

    const membership = await this.membershipRepository.findByOrgAndUser(organizationId, user.sub);
    if (!membership || membership.status !== "ACTIVE") {
      throw new ForbiddenError("You are not an active member of the organization identified by X-Organization-Id.");
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(membership.role)) {
      throw new ForbiddenError(`This action requires one of the following roles: ${requiredRoles.join(", ")}.`);
    }

    request.currentOrganizationId = organizationId;
    request.orgMembership = membership;
    return true;
  }
}
