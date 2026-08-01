import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/** Injects the organizationId resolved by CurrentOrganizationGuard (from the X-Organization-Id header) into a controller method param. */
export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.currentOrganizationId;
  },
);
