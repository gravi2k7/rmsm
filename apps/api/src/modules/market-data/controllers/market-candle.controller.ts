import { Controller, Get, Query, UseGuards, BadRequestException } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MarketDataService } from "../services/market-data.service";
import { CandleQueryDto } from "../dto/candle-query.dto";
import { CandleResponseDto } from "../dto/responses/candle-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

@ApiTags("Market Data — Candles")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/candles")
export class MarketCandleController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  @RequirePermissions("market-data.read")
  @ApiOperation({
    operationId: "listCandles",
    summary: "Candles for one instrument, by interval and date range.",
    description: "Identify the instrument with EITHER instrumentId, OR exchangeId + symbol (resolved via MarketDataService.getInstrumentByExchangeAndSymbol). Excludes superseded correction rows (ADR-022) — always the current value.",
  })
  @ApiOkResponse({ type: [CandleResponseDto] })
  async list(@Query() query: CandleQueryDto): Promise<CandleResponseDto[]> {
    const instrumentId = await this.resolveInstrumentId(query);
    return this.marketDataService.getCandles(instrumentId, query.interval, new Date(query.from), new Date(query.to), query.limit);
  }

  /** Neither class-validator's ValidateIf nor a single DTO shape can express "instrumentId XOR (exchangeId AND symbol)" as one declarative rule — this is the controller-level check that at least one complete, resolvable identification was actually provided. */
  private async resolveInstrumentId(query: CandleQueryDto): Promise<string> {
    if (query.instrumentId) return query.instrumentId;
    if (query.exchangeId && query.symbol) {
      const instrument = await this.marketDataService.getInstrumentByExchangeAndSymbol(query.exchangeId, query.symbol);
      return instrument.id;
    }
    throw new BadRequestException("Provide either instrumentId, or both exchangeId and symbol.");
  }
}
