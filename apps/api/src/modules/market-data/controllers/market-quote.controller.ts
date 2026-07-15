import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MarketDataService } from "../services/market-data.service";
import { QuoteQueryDto } from "../dto/quote-query.dto";
import { QuoteResponseDto } from "../dto/responses/quote-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

/**
 * "Historical Quotes" (named in Phase 4's own spec) is NOT implemented
 * here — `MarketQuoteRepository` (Phase 2A) only has `findLatest`/
 * `findLatestForMany`, no date-range query, and Phase 4 explicitly
 * forbids repository changes. Flagged as a real, deferred gap (same
 * treatment as the exchangeId-filter and cursor-pagination gaps) rather
 * than faked with a method that silently returns the wrong thing.
 */
@ApiTags("Market Data — Quotes")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/quotes")
export class MarketQuoteController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "listLatestQuotes", summary: "Latest quote for each of up to 100 instrument ids." })
  @ApiOkResponse({ type: [QuoteResponseDto] })
  listLatest(@Query() query: QuoteQueryDto): Promise<QuoteResponseDto[]> {
    return this.marketDataService.getLatestQuotes(query.instrumentIds);
  }

  @Get(":instrumentId")
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "getLatestQuote", summary: "Latest quote for one instrument." })
  @ApiOkResponse({ type: QuoteResponseDto })
  getLatest(@Param("instrumentId", ParseUUIDPipe) instrumentId: string): Promise<QuoteResponseDto> {
    return this.marketDataService.getLatestQuote(instrumentId);
  }
}
