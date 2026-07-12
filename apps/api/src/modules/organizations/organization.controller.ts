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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { Organization } from "@rmsm/database";
import { OrganizationService } from "./services/organization.service";
import { OrganizationMembershipService } from "./services/membership.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { OrganizationSettingsDto } from "./dto/organization-settings.dto";
import { OrganizationSearchDto } from "./dto/organization-search.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "./decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "./guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
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
}
