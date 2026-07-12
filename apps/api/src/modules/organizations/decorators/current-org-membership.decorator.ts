import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { OrganizationMembership } from "@rmsm/database";

/** Injects the membership row OrganizationRoleGuard already looked up — avoids a second DB round-trip in the handler. Only populated on routes guarded by @RequireOrgRole(). */
export const CurrentOrgMembership = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OrganizationMembership | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.orgMembership;
  },
);
