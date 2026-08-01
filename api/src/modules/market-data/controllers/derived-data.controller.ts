import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { CandleInterval } from "@rmsm/database";
import { DerivedDataService } from "../services/derived-data.service";
import { DerivedIndicatorSnapshotRepository } from "../repositories/derived-indicator-snapshot.repository";
import { GenerateForInstrumentDto } from "../dto/generate-derived-data.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/** FIP-001 Domain 10 (Derived Data Pipeline). See DerivedDataService's own header comment for why the 8 named indicators are computed here directly rather than delegated to the (currently calculation-less) indicator-engine module. */
@ApiTags("Market Data — Derived Data")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/derived-data")
export class DerivedDataController {
  constructor(
    private readonly derivedDataService: DerivedDataService,
    private readonly snapshotRepository: DerivedIndicatorSnapshotRepository,
  ) {}

  @Post("generate")
  @RequirePermissions("market-data.import.trigger")
  @ApiOperation({ operationId: "generateDerivedData", summary: "Compute and persist ATR/RSI/EMA/SMA/MACD/Bollinger/VWAP/Pivot Points + trend/volatility labels for the latest bar." })
  async generate(@Body() dto: GenerateForInstrumentDto): Promise<{ indicatorsWritten: number }> {
    const written = await this.derivedDataService.generateForInstrument(dto.instrumentId, dto.interval);
    return { indicatorsWritten: written };
  }

  @Get(":instrumentId/:interval/:indicatorKey/latest")
  @RequirePermissions("market-data.admin.manage")
  @ApiOperation({ operationId: "getLatestDerivedIndicator", summary: "Most recent snapshots for one indicator key on one instrument/interval." })
  latest(
    @Param("instrumentId", ParseUUIDPipe) instrumentId: string,
    @Param("interval") interval: CandleInterval,
    @Param("indicatorKey") indicatorKey: string,
  ) {
    return this.snapshotRepository.findLatest(instrumentId, interval, indicatorKey, 20);
  }
}
