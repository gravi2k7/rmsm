import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CandleInterval } from "@rmsm/database";
import { AiReadinessService } from "../services/ai-readiness.service";
import { MarketDataAiSnapshotRepository } from "../repositories/market-data-ai-snapshot.repository";
import { GenerateForInstrumentDto } from "../dto/generate-derived-data.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/** FIP-001 Domain 12 (AI Readiness). */
@ApiTags("Market Data — AI Readiness")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/ai-readiness")
export class AiReadinessController {
  constructor(
    private readonly aiReadinessService: AiReadinessService,
    private readonly snapshotRepository: MarketDataAiSnapshotRepository,
  ) {}

  @Post("generate")
  @RequirePermissions("market-data.import.trigger")
  @ApiOperation({ operationId: "generateAiReadinessSnapshot", summary: "Compute and persist an AI-readiness snapshot (trend, volatility, liquidity, confidence, session, spread, market regime, anomaly flags) for the latest bar." })
  generate(@Body() dto: GenerateForInstrumentDto) {
    return this.aiReadinessService.generateForInstrument(dto.instrumentId, dto.interval);
  }

  @Get(":instrumentId/:interval/latest")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getLatestAiReadinessSnapshot", summary: "Most recent AI-readiness snapshot for one instrument/interval." })
  latest(@Param("instrumentId", ParseUUIDPipe) instrumentId: string, @Param("interval") interval: CandleInterval) {
    return this.snapshotRepository.findLatest(instrumentId, interval);
  }
}
