import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrganizationDashboardService, OrganizationDashboard } from "./organization-dashboard.service";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { RequireOrgRole } from "../decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../guards/organization-role.guard";
import { CurrentOrganizationGuard } from "../guards/current-organization.guard";
import { CurrentOrganizationId } from "../decorators/current-organization-id.decorator";
import { ALL_ORG_ROLES } from "../constants";

/**
 * Fills the gap between the Module 003 spec's Dashboard functional
 * requirement (Section 4) and its REST API surface list (Section 5),
 * which didn't itself enumerate a dashboard route. `organization.read`
 * (the same permission the existing GET endpoints already require) gates
 * both routes here — a dashboard is a read view over data the caller can
 * already see individually, not a new capability.
 */
@ApiTags("Organizations")
@ApiBearerAuth()
@Controller("organizations")
export class OrganizationDashboardController {
  constructor(private readonly dashboardService: OrganizationDashboardService) {}

  @Get(":organizationId/dashboard")
  @UseGuards(PermissionsGuard, OrganizationRoleGuard)
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @ApiOperation({ operationId: "getOrganizationDashboard", summary: "Get the organization's dashboard summary." })
  getDashboard(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<OrganizationDashboard> {
    return this.dashboardService.getDashboard(organizationId);
  }

  @Get("current/dashboard")
  @UseGuards(PermissionsGuard, CurrentOrganizationGuard)
  @ApiHeader({ name: "X-Organization-Id", required: true })
  @RequirePermissions("organization.read")
  @RequireOrgRole(...ALL_ORG_ROLES)
  @ApiOperation({ operationId: "getCurrentOrganizationDashboard", summary: "Get the current organization's dashboard summary." })
  getCurrentDashboard(@CurrentOrganizationId() organizationId: string): Promise<OrganizationDashboard> {
    return this.dashboardService.getDashboard(organizationId);
  }
}
