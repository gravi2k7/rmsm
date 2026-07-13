import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { UsageRecord } from "@rmsm/database";
import { UsageService } from "./services/usage.service";
import { UsageHistoryQueryDto } from "./dto/usage-history-query.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { BILLING_READ_ROLES } from "./constants";

@ApiTags("Billing Usage")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("billing/organizations/:organizationId/usage")
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @RequirePermissions("billing.usage.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "getCurrentUsage", summary: "Get the organization's usage for the current billing period." })
  getCurrent(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<UsageRecord[]> {
    return this.usageService.getCurrentUsage(organizationId);
  }

  @Get("history")
  @RequirePermissions("billing.usage.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "getUsageHistory", summary: "Get historical usage for a metric across past periods." })
  getHistory(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() query: UsageHistoryQueryDto,
  ): Promise<UsageRecord[]> {
    return this.usageService.getUsageHistory(organizationId, query.metric, query.monthsAgo);
  }
}
