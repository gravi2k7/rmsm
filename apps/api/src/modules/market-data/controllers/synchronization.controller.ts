import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiTags,
  ApiPropertyOptional,
} from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";
import type { AccessTokenPayload } from "../../auth/services/token.service";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";
import { MarketDataAdminService } from "../services/market-data-admin.service";
import { HistoricalImportService } from "../services/historical-import.service";
import { ReferenceDataSynchronizationService } from "../services/reference-data-synchronization.service";
import { QuoteSynchronizationService } from "../services/quote-synchronization.service";
import { CTraderInstrumentCatalogBootstrapService } from "../providers/ctrader/ctrader-fix.catalog.bootstrap";
import { CTraderFixInstrumentResolver } from "../providers/ctrader/ctrader-fix.instrument-resolver";
import type { CTraderCatalogSynchronizationResult } from "../providers/ctrader/ctrader-fix.catalog-synchronizer";
import { CTraderCatalogSynchronizationDto } from "../dto/ctrader-catalog-synchronization.dto";
import { ImportJobResponseDto } from "../dto/responses/import-job-response.dto";
import { SynchronizationHealthResponseDto } from "../dto/responses/synchronization-health-response.dto";
import { ImportHistoricalCandlesDto } from "../dto/import-historical-candles.dto";

const IMPORT_JOB_STATUS_VALUES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "PARTIAL",
  "CANCELLED",
] as const;

class ImportJobStatusQueryDto {
  @ApiPropertyOptional({ enum: IMPORT_JOB_STATUS_VALUES })
  @IsOptional()
  @IsEnum(IMPORT_JOB_STATUS_VALUES)
  status?: (typeof IMPORT_JOB_STATUS_VALUES)[number];
}

/**
 * Administrative synchronization/import surface.
 *
 * Reporting endpoints expose existing synchronization state.
 * The POST import endpoint invokes the existing HistoricalImportService,
 * which owns the provider-agnostic fetch → validate → deduplicate →
 * persist transaction.
 */
@ApiTags("Market Data — Synchronization")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/synchronizations")
export class SynchronizationController {
  constructor(
    private readonly adminService: MarketDataAdminService,
    private readonly historicalImportService: HistoricalImportService,
    private readonly referenceDataSynchronizationService: ReferenceDataSynchronizationService,
    private readonly quoteSynchronizationService: QuoteSynchronizationService,
    private readonly cTraderCatalogBootstrapService: CTraderInstrumentCatalogBootstrapService,
    private readonly cTraderInstrumentResolver: CTraderFixInstrumentResolver,
  ) {}

  @Post("reference-data")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "synchronizeTwelveDataReferenceData",
    summary: "Synchronize Twelve Data reference data.",
    description:
      "Synchronizes exchanges, instruments, and Twelve Data instrument aliases through the existing reference-data synchronization service.",
  })
  @ApiOkResponse({
    description: "Reference-data synchronization result.",
  })
  synchronizeTwelveDataReferenceData() {
    return this.referenceDataSynchronizationService.synchronizeTwelveData();
  }

  @Post("ctrader/catalog")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "synchronizeCTraderCatalog",
    summary: "Synchronize the cTrader instrument catalog.",
    description:
      "Requests the cTrader FIX SecurityList catalog and synchronizes entries that resolve to existing canonical RMSM instruments through provider aliases.",
  })
  @ApiOkResponse({
    description: "cTrader catalog synchronization result.",
  })
  synchronizeCTraderCatalog(
    @Body() dto: CTraderCatalogSynchronizationDto,
  ): Promise<CTraderCatalogSynchronizationResult> {
    return this.cTraderCatalogBootstrapService.bootstrap({
      providerId: dto.providerId,
      timeoutMs: dto.timeoutMs,
      resolve: (entry) =>
        this.cTraderInstrumentResolver.resolve(
          dto.providerId,
          entry,
        ),
    });
  }

  @Post("quotes/:instrumentId")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "synchronizeInstrumentQuote",
    summary: "Synchronize the latest live quote for one instrument.",
    description:
      "Resolves the active provider and instrument alias, fetches the latest normalized quote, and persists it through the market-data quote repository.",
  })
  @ApiOkResponse({
    description: "Live quote synchronization result.",
  })
  synchronizeInstrumentQuote(
    @Param("instrumentId", ParseUUIDPipe) instrumentId: string,
  ) {
    return this.quoteSynchronizationService.synchronizeInstrument(
      instrumentId,
    );
  }

  @Post("import")
  @RequirePermissions("market-data.import.trigger")
  @ApiOperation({
    operationId: "importHistoricalCandles",
    summary: "Import historical market candles.",
    description:
      "Fetches historical candles through the configured provider, validates and deduplicates them, then persists them atomically.",
  })
  @ApiOkResponse({ type: ImportJobResponseDto })
  async importHistoricalCandles(
    @Body() dto: ImportHistoricalCandlesDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ImportJobResponseDto> {
    const from = new Date(dto.from);
    const to = new Date(dto.to);

    if (from >= to) {
      throw new Error("The 'from' date must be earlier than the 'to' date.");
    }

    return this.historicalImportService.importHistoricalCandles(
      {
        instrumentId: dto.instrumentId,
        providerConfigId: dto.providerConfigId,
        interval: dto.interval,
        from,
        to,
      },
      user.sub,
    );
  }

  @Get("health")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "getSynchronizationHealth",
    summary: "A coarse, all-time-count-based health signal for import activity.",
  })
  @ApiOkResponse({ type: SynchronizationHealthResponseDto })
  health(): Promise<SynchronizationHealthResponseDto> {
    return this.adminService.getSynchronizationHealth();
  }

  @Get("metrics")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "getSynchronizationMetrics",
    summary: "In-memory synchronization metrics.",
  })
  @ApiOkResponse({
    description: "A flat map of counter name to count.",
  })
  metrics(): Record<string, number> {
    return this.adminService.getMetrics();
  }

  @Get("import-jobs")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "listImportJobs",
    summary: "List import jobs, optionally filtered by status.",
  })
  @ApiOkResponse({ type: [ImportJobResponseDto] })
  listImportJobs(
    @Query() query: ImportJobStatusQueryDto,
  ): Promise<ImportJobResponseDto[]> {
    return this.adminService.listImportJobsByStatus(
      query.status ?? "RUNNING",
    );
  }

  @Get("import-jobs/:id")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({
    operationId: "getImportJob",
    summary: "Get one import job's status by id.",
  })
  @ApiOkResponse({ type: ImportJobResponseDto })
  getImportJob(
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<ImportJobResponseDto> {
    return this.adminService.getImportJob(id);
  }
}
