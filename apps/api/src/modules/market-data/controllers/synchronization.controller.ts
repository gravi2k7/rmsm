import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import { MarketDataAdminService } from "../services/market-data-admin.service";
import { ImportJobResponseDto } from "../dto/responses/import-job-response.dto";
import { SynchronizationHealthResponseDto } from "../dto/responses/synchronization-health-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

const IMPORT_JOB_STATUS_VALUES = ["PENDING", "RUNNING", "COMPLETED", "FAILED", "PARTIAL", "CANCELLED"] as const;

class ImportJobStatusQueryDto {
  @ApiPropertyOptional({ enum: IMPORT_JOB_STATUS_VALUES })
  @IsOptional()
  @IsEnum(IMPORT_JOB_STATUS_VALUES)
  status?: (typeof IMPORT_JOB_STATUS_VALUES)[number];
}

/**
 * Administrative endpoints only, per Phase 4's explicit scope — "No
 * scheduler implementation" here either; this surface only reports on
 * synchronization/import activity that already happened
 * (`HistoricalImportService`, Phase 3), it never triggers anything.
 */
@ApiTags("Market Data — Synchronization")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/synchronizations")
export class SynchronizationController {
  constructor(private readonly adminService: MarketDataAdminService) {}

  @Get("health")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getSynchronizationHealth", summary: "A coarse, all-time-count-based health signal for import activity." })
  @ApiOkResponse({ type: SynchronizationHealthResponseDto })
  health(): Promise<SynchronizationHealthResponseDto> {
    return this.adminService.getSynchronizationHealth();
  }

  @Get("metrics")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getSynchronizationMetrics", summary: "In-memory counters for this running instance only (MarketDataMetricsService's own scope note)." })
  @ApiOkResponse({ description: "A flat map of counter name to count." })
  metrics(): Record<string, number> {
    return this.adminService.getMetrics();
  }

  @Get("import-jobs")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "listImportJobs",
    summary: "List import jobs, optionally filtered by status.",
    description: "DataImportJobRepository.findByStatus() (Phase 2A) requires a status — there is no \"list all\" repository method, and Phase 4 forbids repository changes. Defaults to RUNNING when the status query param is omitted (a judgment call — shows what's currently in-flight — not a spec'd default), rather than silently picking something without saying so.",
  })
  @ApiOkResponse({ type: [ImportJobResponseDto] })
  listImportJobs(@Query() query: ImportJobStatusQueryDto): Promise<ImportJobResponseDto[]> {
    return this.adminService.listImportJobsByStatus(query.status ?? "RUNNING");
  }

  @Get("import-jobs/:id")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getImportJob", summary: "Get one import job's status by id." })
  @ApiOkResponse({ type: ImportJobResponseDto })
  getImportJob(@Param("id", ParseUUIDPipe) id: string): Promise<ImportJobResponseDto> {
    return this.adminService.getImportJob(id);
  }
}
