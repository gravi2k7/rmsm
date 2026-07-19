import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { QueryBus } from "@nestjs/cqrs";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { PortfolioResponseDto, PositionListResponseDto, TradeListResponseDto } from "./dto/portfolio.dto";
import { GetPortfolioQuery, ListPositionsQuery, ListTradesQuery } from "./queries/portfolio.queries";

@ApiTags("Portfolio")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller()
export class PortfolioController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get("portfolio")
  @RequirePermissions("portfolio.read")
  @ApiOperation({ summary: "Get the portfolio's own cash/margin/position summary." })
  getPortfolio(): Promise<PortfolioResponseDto> {
    return this.queryBus.execute(new GetPortfolioQuery());
  }

  @Get("positions")
  @RequirePermissions("portfolio.read")
  @ApiOperation({ summary: "List positions (open and closed), paginated." })
  listPositions(@Query() query: PaginationQueryDto): Promise<PositionListResponseDto> {
    return this.queryBus.execute(new ListPositionsQuery(query));
  }

  @Get("trades")
  @RequirePermissions("portfolio.read")
  @ApiOperation({ summary: "List completed round-trip trades, paginated." })
  listTrades(@Query() query: PaginationQueryDto): Promise<TradeListResponseDto> {
    return this.queryBus.execute(new ListTradesQuery(query));
  }
}
