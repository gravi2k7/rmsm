import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request } from "express";
import type { OrganizationMembership, OrganizationMembershipWithUser } from "@rmsm/database";
import { OrganizationMembershipService, TransferOwnershipResult } from "./services/membership.service";
import { OrganizationInvitationService } from "./services/invitation.service";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { InvitationTokenDto } from "./dto/invitation-token.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "./decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "./guards/organization-role.guard";
import { Public } from "../auth/decorators/public.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { ALL_ORG_ROLES, MANAGEMENT_ORG_ROLES, ADMIN_ORG_ROLES, OWNER_ONLY_ORG_ROLE } from "./constants";
import { requestContext } from "./utils/request-context.util";

@ApiTags("Organization Members")
@ApiBearerAuth()
@Controller()
export class MembershipController {
  constructor(
    private readonly membershipService: OrganizationMembershipService,
    private readonly invitationService: OrganizationInvitationService,
  ) {}

  // ── Token-based endpoints: no :organizationId, no OrganizationRoleGuard ──

  // WM-020E — same rationale as auth.controller.ts's forgot-password/
  // resend-verification endpoints: these are public, token-guessable
  // surfaces (5/min matches that established pattern), on top of the
  // app-wide ThrottlerGuard already registered in app.module.ts.
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("organizations/invitations/decline")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "declineInvitation", summary: "Decline an invitation using its token. No account required." })
  declineInvitation(@Body() dto: InvitationTokenDto): Promise<{ message: string }> {
    return this.invitationService.rejectInvitation(dto.token);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("organizations/invitations/accept")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "acceptInvitation", summary: "Accept an invitation using its token. Requires the invitation's email to match the authenticated account." })
  acceptInvitation(
    @Body() dto: InvitationTokenDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationMembership> {
    return this.invitationService.acceptInvitation(dto.token, user.sub, requestContext(req));
  }

  // ── Organization-scoped endpoints ─────────────────────────────────────

  @Get("organizations/:organizationId/members")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @ApiOperation({ operationId: "listMembers", summary: "List active members of an organization." })
  listMembers(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationMembershipWithUser[]> {
    return this.membershipService.listActiveMembers(organizationId);
  }

  @Get("organizations/:organizationId/members/:membershipId")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @ApiOperation({ operationId: "getMember", summary: "Get a single member of an organization." })
  getMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
  ): Promise<OrganizationMembershipWithUser> {
    return this.membershipService.getMember(organizationId, membershipId);
  }

  @Post("organizations/:organizationId/members/invite")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.invite")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @ApiOperation({ operationId: "inviteMember", summary: "Invite a new member to an organization by email." })
  inviteMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.invitationService.createInvitation(organizationId, dto.email, dto.role, user.sub, requestContext(req), {
      message: dto.message,
      expiresInDays: dto.expiresInDays,
    });
  }

  @Patch("organizations/:organizationId/members/:membershipId/role")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "updateMemberRole", summary: "Change a member's role (not to/from Owner — use transfer-ownership for that)." })
  updateMemberRole(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationMembership> {
    return this.membershipService.changeRole(organizationId, membershipId, dto.role, user.sub, requestContext(req));
  }

  @Post("organizations/:organizationId/members/:membershipId/suspend")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "suspendMember", summary: "Suspend a member's access without removing them." })
  suspendMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationMembership> {
    return this.membershipService.suspendMember(organizationId, membershipId, user.sub, requestContext(req));
  }

  @Post("organizations/:organizationId/members/:membershipId/reactivate")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "reactivateMember", summary: "Reactivate a suspended member." })
  reactivateMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationMembership> {
    return this.membershipService.reactivateMember(organizationId, membershipId, user.sub, requestContext(req));
  }

  @Delete("organizations/:organizationId/members/:membershipId")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.remove")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: "removeMember", summary: "Remove a member from the organization. Cannot remove the final active Owner." })
  removeMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("membershipId", ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<void> {
    return this.membershipService.removeMember(organizationId, membershipId, user.sub, requestContext(req));
  }

  @Post("organizations/:organizationId/members/leave")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "leaveOrganization", summary: "Leave an organization you are a member of. The sole active Owner cannot leave." })
  leaveOrganization(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<void> {
    return this.membershipService.leaveOrganization(organizationId, user.sub, requestContext(req));
  }

  @Post("organizations/:organizationId/members/transfer-ownership")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.owner.transfer")
  @RequireOrgRole(...OWNER_ONLY_ORG_ROLE)
  @ApiOperation({ operationId: "transferOwnership", summary: "Transfer ownership to another active member. Owner only." })
  transferOwnership(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<TransferOwnershipResult> {
    return this.membershipService.transferOwnership(organizationId, dto.toMembershipId, user.sub, requestContext(req));
  }

  @Post("organizations/:organizationId/invitations/:invitationId/cancel")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.member.invite")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "cancelInvitation", summary: "Cancel a pending invitation." })
  cancelInvitation(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invitationId", ParseUUIDPipe) invitationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.invitationService.cancelInvitation(organizationId, invitationId, user.sub, requestContext(req));
  }
}
