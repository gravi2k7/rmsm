import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { OrganizationStatisticsService, OrganizationStatistics } from "./services/statistics.service";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "./decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "./guards/organization-role.guard";
import { MANAGEMENT_ORG_ROLES } from "./constants";

@ApiTags("Organization Statistics")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("organizations/:organizationId/statistics")
export class OrganizationStatisticsController {
  constructor(private readonly statisticsService: OrganizationStatisticsService) {}

  @Get()
  @RequirePermissions("organization.read")
  @RequireOrgRole(...MANAGEMENT_ORG_ROLES)
  @ApiOperation({ operationId: "getOrganizationStatistics", summary: "Get member/invitation counts for an organization." })
  getStatistics(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<OrganizationStatistics> {
    return this.statisticsService.getStatistics(organizationId);
  }
}
