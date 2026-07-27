import { Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { OrganizationInvitation, OrganizationRole } from "@rmsm/database";
import { OrganizationInvitationService } from "./services/invitation.service";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "./decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "./guards/organization-role.guard";
import { Public } from "../auth/decorators/public.decorator";
import { Throttle } from "@nestjs/throttler";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { MANAGEMENT_ORG_ROLES } from "./constants";
import { requestContext } from "./utils/request-context.util";

@ApiTags("Organization Invitations")
@Controller("organizations")
export class InvitationController {
  constructor(private readonly invitationService: OrganizationInvitationService) {}

  // WM-020E — public, token-guessable surface; same 5/min pattern as
  // auth.controller.ts's forgot-password/resend-verification and this
  // module's own accept/decline endpoints.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get("invitations/validate")
  @ApiQuery({ name: "token", required: true })
  @ApiOperation({ operationId: "validateInvitation", summary: "Check whether an invitation token is currently valid, without consuming it." })
  validateInvitation(
    @Query("token") token: string,
  ): Promise<{ valid: boolean; organizationName?: string; role?: OrganizationRole; email?: string }> {
    return this.invitationService.validateToken(token);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.read")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @Get(":organizationId/invitations")
  @ApiOperation({ operationId: "listInvitations", summary: "List pending invitations for an organization." })
  listInvitations(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<OrganizationInvitation[]> {
    return this.invitationService.listPendingForOrganization(organizationId);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.read")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @Get(":organizationId/invitations/:invitationId")
  @ApiOperation({ operationId: "getInvitation", summary: "Get a single invitation by id." })
  getInvitation(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
  ): Promise<OrganizationInvitation> {
    return this.invitationService.getInvitation(organizationId, invitationId);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.invite")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @Post(":organizationId/invitations/:invitationId/resend")
  @ApiOperation({ operationId: "resendInvitation", summary: "Resend an invitation with a fresh token and expiry." })
  resendInvitation(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.invitationService.resendInvitation(organizationId, invitationId, user.sub, requestContext(req));
  }

  @ApiBearerAuth()
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.invite")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @Post(":organizationId/invitations/:invitationId/expire")
  @ApiOperation({ operationId: "expireInvitation", summary: "Force a single pending invitation to EXPIRED immediately." })
  expireInvitation(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationInvitation> {
    return this.invitationService.expireInvitation(organizationId, invitationId, user.sub, requestContext(req));
  }
}
