import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ImportSchedulerService } from "../services/import-scheduler.service";
import { ValidationReportService, ValidationReport } from "../services/validation-report.service";
import { DataImportJobRepository } from "../repositories/data-import-job.repository";
import { ScheduleImportDto } from "../dto/schedule-import.dto";
import { ImportJobResponseDto } from "../dto/responses/import-job-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import type { DataImportJobModel } from "../interfaces/models/operational.models";

function toResponseDto(job: DataImportJobModel): ImportJobResponseDto {
  return {
    id: job.id,
    providerId: job.providerId,
    jobType: job.jobType,
    status: job.status,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    recordsProcessed: job.recordsProcessed,
    recordsFailed: job.recordsFailed,
    errorSummary: job.errorSummary,
  };
}

/**
 * FIP-001 Domain 3 (Historical Import Engine) + Domain 5's "Generate
 * validation report" endpoint. `SynchronizationController`'s existing
 * `/market-data/synchronizations/import-jobs*` routes remain the
 * read-only Phase-4 reporting surface over the ORIGINAL single-shot
 * import path; this controller is the new mutating surface —
 * schedule/resume/retry — over the batched/resumable path this phase
 * adds, at its own `/market-data/import-jobs` base path to avoid any
 * route collision.
 */
@ApiTags("Market Data — Import Jobs")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/import-jobs")
export class ImportJobController {
  constructor(
    private readonly schedulerService: ImportSchedulerService,
    private readonly validationReportService: ValidationReportService,
    private readonly importJobRepository: DataImportJobRepository,
  ) {}

  @Post()
  @RequirePermissions("market-data.import.trigger")
  @ApiOperation({ operationId: "scheduleImport", summary: "Schedule a batched, resumable, retryable historical import (one-click, date-range, or incremental)." })
  @ApiOkResponse({ type: ImportJobResponseDto })
  async schedule(@Body() dto: ScheduleImportDto): Promise<ImportJobResponseDto> {
    const job = await this.schedulerService.scheduleImport(
      {
        instrumentId: dto.instrumentId,
        providerConfigId: dto.providerConfigId,
        interval: dto.interval,
        from: new Date(dto.from),
        to: new Date(dto.to),
        isIncremental: dto.isIncremental,
        priority: dto.priority,
        scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      },
      dto.providerConfigId,
    );
    return toResponseDto(job);
  }

  @Post(":id/resume")
  @RequirePermissions("market-data.import.trigger")
  @ApiOperation({ operationId: "resumeImport", summary: "Resume an interrupted RUNNING import job from its last successfully-persisted batch." })
  async resume(@Param("id", ParseUUIDPipe) id: string): Promise<{ resumed: boolean }> {
    await this.schedulerService.resumeImport(id);
    return { resumed: true };
  }

  @Post(":id/retry")
  @RequirePermissions("market-data.import.trigger")
  @ApiOperation({ operationId: "retryImport", summary: "Retry a FAILED import job as a new child job (up to the retry ceiling)." })
  @ApiOkResponse({ type: ImportJobResponseDto })
  async retry(@Param("id", ParseUUIDPipe) id: string): Promise<ImportJobResponseDto> {
    const job = await this.schedulerService.retryImport(id);
    return toResponseDto(job);
  }

  @Get("history")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getImportHistory", summary: "Import history for one provider, newest first." })
  @ApiOkResponse({ type: [ImportJobResponseDto] })
  async history(@Query("providerId", ParseUUIDPipe) providerId: string): Promise<ImportJobResponseDto[]> {
    const jobs = await this.importJobRepository.findByProvider(providerId, 100);
    return jobs.map(toResponseDto);
  }

  @Get("statistics")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getImportStatistics", summary: "Import job counts grouped by status." })
  statistics(): Promise<Record<string, number>> {
    return this.importJobRepository.countByStatus();
  }

  @Get(":id/validation-report")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getValidationReport", summary: "Domain 5: a structured validation report for one import job (rejected-record counts by type/severity)." })
  getValidationReport(@Param("id", ParseUUIDPipe) id: string): Promise<ValidationReport> {
    return this.validationReportService.generateForImportJob(id);
  }
}
