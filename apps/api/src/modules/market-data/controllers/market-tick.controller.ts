import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { MarketDataService } from "../services/market-data.service";
import { TickQueryDto } from "../dto/tick-query.dto";
import { TickResponseDto } from "../dto/responses/tick-response.dto";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../auth/guards/permissions.guard";

@ApiTags("Market Data — Ticks")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("market-data/ticks")
export class MarketTickController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get()
  @RequirePermissions("market-data.read")
  @ApiOperation({ operationId: "listTicks", summary: "Ticks for one instrument, by date range." })
  @ApiOkResponse({ type: [TickResponseDto] })
  list(@Query() query: TickQueryDto): Promise<TickResponseDto[]> {
    return this.marketDataService.getTicks(query.instrumentId, new Date(query.from), new Date(query.to), query.limit);
  }
}
