import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { QueryBus } from "@nestjs/cqrs";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CandleQueryDto } from "./dto/candle-query.dto";
import { ExchangeResponseDto, ExchangeListResponseDto, SymbolListResponseDto, CandleListResponseDto } from "./dto/market-response.dto";
import { ListExchangesQuery, GetExchangeByIdQuery, ListSymbolsQuery, ListCandlesQuery } from "./queries/market.queries";

@ApiTags("Market")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller()
export class MarketController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get("markets")
  @RequirePermissions("markets.read")
  @ApiOperation({ summary: "List exchanges, paginated." })
  listMarkets(@Query() query: PaginationQueryDto): Promise<ExchangeListResponseDto> {
    return this.queryBus.execute(new ListExchangesQuery(query));
  }

  @Get("markets/:id")
  @RequirePermissions("markets.read")
  @ApiOperation({ summary: "Get an exchange by id." })
  getMarket(@Param("id") id: string): Promise<ExchangeResponseDto> {
    return this.queryBus.execute(new GetExchangeByIdQuery(id));
  }

  @Get("symbols")
  @RequirePermissions("markets.read")
  @ApiOperation({ summary: "List tradable symbols, paginated." })
  listSymbols(@Query() query: PaginationQueryDto): Promise<SymbolListResponseDto> {
    return this.queryBus.execute(new ListSymbolsQuery(query));
  }

  @Get("candles")
  @RequirePermissions("markets.read")
  @ApiOperation({ summary: "List candles for a symbol/timeframe/date-range, paginated." })
  listCandles(@Query() query: CandleQueryDto): Promise<CandleListResponseDto> {
    return this.queryBus.execute(new ListCandlesQuery(query));
  }
}
