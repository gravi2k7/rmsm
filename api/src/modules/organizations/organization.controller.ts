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
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { Organization } from "@rmsm/database";
import { OrganizationService } from "./services/organization.service";
import { OrganizationMembershipService } from "./services/membership.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationSettingsDto } from "./dto/organization-settings.dto";
import { UpdateOrganizationSettingsDto } from "./dto/organization-settings-v2.dto";
import { UpdateOrganizationBrandingDto } from "./dto/update-organization-branding.dto";
import { OrganizationSearchDto } from "./dto/organization-search.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "./decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "./guards/organization-role.guard";
import { CurrentOrganizationGuard } from "./guards/current-organization.guard";
import { CurrentOrganizationId } from "./decorators/current-organization-id.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import type { TransferOwnershipResult } from "./services/membership.service";
import { ALL_ORG_ROLES, ADMIN_ORG_ROLES, OWNER_ONLY_ORG_ROLE } from "./constants";
import { requestContext } from "./utils/request-context.util";

@ApiTags("Organizations")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("organizations")
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly membershipService: OrganizationMembershipService,
  ) {}

  @Post()
  @RequirePermissions("organization.create")
  @ApiOperation({ operationId: "createOrganization", summary: "Create a new organization. The caller becomes its Owner." })
  createOrganization(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.createOrganization(dto, user.sub, requestContext(req));
  }

  /**
   * Deliberately scoped to "organizations the caller is an active member
   * of," not every organization on the platform — an unscoped list would
   * be a cross-tenant data leak. Platform-wide oversight across all
   * tenants belongs to a future SaaS Administration module with its own
   * dedicated permission, not bolted onto this endpoint.
   */
  @Get()
  @RequirePermissions("organization.read")
  @ApiOperation({ operationId: "listOrganizations", summary: "List/search organizations the authenticated user belongs to." })
  async listOrganizations(
    @Query() query: OrganizationSearchDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ items: Organization[]; total: number }> {
    const memberships = await this.membershipService.listOrganizationsForUser(user.sub);
    const filtered = query.search
      ? memberships.filter((org) => org.name.toLowerCase().includes(query.search!.toLowerCase()))
      : memberships;
    const statusFiltered = query.status ? filtered.filter((org) => org.status === query.status) : filtered;
    const start = query.skip;
    const end = start + query.take;
    return { items: statusFiltered.slice(start, end), total: statusFiltered.length };
  }

  // ── Module 003: "current organization" routes ──────────────────────
  //
  // Registered BEFORE the `:organizationId` routes below so Express
  // matches the literal "current" segment first — `:organizationId` would
  // otherwise greedily match "current" as if it were an id. Each of these
  // uses CurrentOrganizationGuard (method-level only, additive — the
  // controller-level OrganizationRoleGuard above is a no-op here since
  // there is no :organizationId route param to read) to resolve the
  // organization from the required X-Organization-Id header. See that
  // guard's file comment for why a header, not a new JWT/session field,
  // is the resolution mechanism.

  @Get("current")
  @UseGuards(CurrentOrganizationGuard)
  @ApiHeader({ name: "X-Organization-Id", required: true })
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @ApiOperation({ operationId: "getCurrentOrganization", summary: "Get the organization identified by the X-Organization-Id header." })
  getCurrentOrganization(@CurrentOrganizationId() organizationId: string): Promise<Organization> {
    return this.organizationService.getById(organizationId);
  }

  @Patch("current/profile")
  @UseGuards(CurrentOrganizationGuard)
  @ApiHeader({ name: "X-Organization-Id", required: true })
  @RequirePermissions("organization.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "updateCurrentOrganizationProfile", summary: "Update the current organization's profile fields." })
  updateCurrentOrganizationProfile(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.updateDetails(organizationId, dto, user.sub, requestContext(req));
  }

  @Patch("current/settings")
  @UseGuards(CurrentOrganizationGuard)
  @ApiHeader({ name: "X-Organization-Id", required: true })
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({
    operationId: "updateCurrentOrganizationSettings",
    summary: "Update one or more of the current organization's 12 structured settings categories.",
  })
  updateCurrentOrganizationSettings(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UpdateOrganizationSettingsDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.updateSettingsCategories(organizationId, dto, user.sub, requestContext(req));
  }

  @Patch("current/branding")
  @UseGuards(CurrentOrganizationGuard)
  @ApiHeader({ name: "X-Organization-Id", required: true })
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "updateCurrentOrganizationBranding", summary: "Update the current organization's branding." })
  updateCurrentOrganizationBranding(
    @CurrentOrganizationId() organizationId: string,
    @Body() dto: UpdateOrganizationBrandingDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.updateBranding(organizationId, dto, user.sub, requestContext(req));
  }

  @Get(":organizationId")
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @ApiOperation({ operationId: "getOrganization", summary: "Get an organization by id." })
  getOrganization(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<Organization> {
    return this.organizationService.getById(organizationId);
  }

  @Patch(":organizationId")
  @RequirePermissions("organization.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "updateOrganization", summary: "Update organization details (not slug or status)." })
  updateOrganization(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.updateDetails(organizationId, dto, user.sub, requestContext(req));
  }

  @Patch(":organizationId/settings")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  @ApiOperation({ operationId: "updateOrganizationSettings", summary: "Replace the organization's settings JSON." })
  updateSettings(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: OrganizationSettingsDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.updateDetails(
      organizationId,
      { settings: dto.settings },
      user.sub,
      requestContext(req),
    );
  }

  @Delete(":organizationId")
  @RequirePermissions("organization.delete")
  @RequireOrgRole(...OWNER_ONLY_ORG_ROLE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ operationId: "deleteOrganization", summary: "Soft-delete an organization. Owner only." })
  deleteOrganization(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.softDelete(organizationId, user.sub, requestContext(req));
  }

  @Post(":organizationId/restore")
  @RequirePermissions("organization.restore")
  @RequireOrgRole(...OWNER_ONLY_ORG_ROLE)
  @ApiOperation({ operationId: "restoreOrganization", summary: "Restore an archived organization to ACTIVE. Owner only." })
  restoreOrganization(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.restore(organizationId, user.sub, requestContext(req));
  }

  @Post(":organizationId/archive")
  @RequirePermissions("organization.delete")
  @RequireOrgRole(...OWNER_ONLY_ORG_ROLE)
  @ApiOperation({ operationId: "archiveOrganization", summary: "Archive an organization (reversible via restore). Owner only." })
  archiveOrganization(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Organization> {
    return this.organizationService.archive(organizationId, user.sub, requestContext(req));
  }

  /**
   * Module 003 spec alias for the transfer-ownership capability. The
   * canonical implementation and route (`POST /organizations/:organizationId/
   * members/transfer-ownership`, MembershipController) already existed
   * before this module and is unchanged — this method adds zero new
   * business logic, it delegates to the exact same
   * `OrganizationMembershipService.transferOwnership()` call. Both routes
   * remain available: the original for backward compatibility, this one
   * because the Module 003 REST surface explicitly lists
   * `POST /organizations/:id/transfer-owner`.
   */
  @Post(":organizationId/transfer-owner")
  @RequirePermissions("organization.owner.transfer")
  @RequireOrgRole(...OWNER_ONLY_ORG_ROLE)
  @ApiOperation({
    operationId: "transferOwner",
    summary: "Alias for POST /organizations/:organizationId/members/transfer-ownership. Owner only.",
  })
  transferOwner(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<TransferOwnershipResult> {
    return this.membershipService.transferOwnership(organizationId, dto.toMembershipId, user.sub, requestContext(req));
  }
}
