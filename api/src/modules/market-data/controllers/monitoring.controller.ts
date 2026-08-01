import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { MonitoringDashboardService, MonitoringDashboard } from "../services/monitoring-dashboard.service";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/** FIP-001 Domain 11 (Monitoring) — the single Enterprise Dashboard endpoint. */
@ApiTags("Market Data — Monitoring")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/monitoring")
export class MonitoringController {
  constructor(private readonly dashboardService: MonitoringDashboardService) {}

  @Get("dashboard")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getMonitoringDashboard", summary: "Combined provider health, import job/gap/quality counts, and storage usage." })
  getDashboard(): Promise<MonitoringDashboard> {
    return this.dashboardService.getDashboard();
  }
}
