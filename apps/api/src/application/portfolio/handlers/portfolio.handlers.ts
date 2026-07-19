import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { UnknownPortfolioError } from "@rmsm/portfolio";
import type { PortfolioRepository } from "@rmsm/portfolio";
import { GetPortfolioQuery, ListPositionsQuery, ListTradesQuery } from "../queries/portfolio.queries";
import { PORTFOLIO_REPOSITORY } from "../portfolio.tokens";
import { DEFAULT_PORTFOLIO_ID } from "../../../infrastructure/persistence/memory/portfolio/portfolio.seed";
import { PortfolioMapper } from "../mappers/portfolio.mapper";
import { PositionListResponseDto, TradeListResponseDto } from "../dto/portfolio.dto";
import type { PortfolioResponseDto } from "../dto/portfolio.dto";
import { paginateArray } from "../../common/dto/pagination.dto";

@QueryHandler(GetPortfolioQuery)
export class GetPortfolioHandler implements IQueryHandler<GetPortfolioQuery, PortfolioResponseDto> {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolioRepository: PortfolioRepository,
    private readonly mapper: PortfolioMapper,
  ) {}

  async execute(): Promise<PortfolioResponseDto> {
    const portfolio = await this.portfolioRepository.findById(DEFAULT_PORTFOLIO_ID);
    if (!portfolio) throw new UnknownPortfolioError(DEFAULT_PORTFOLIO_ID);
    return this.mapper.toPortfolioDto(portfolio);
  }
}

@QueryHandler(ListPositionsQuery)
export class ListPositionsHandler implements IQueryHandler<ListPositionsQuery, PositionListResponseDto> {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolioRepository: PortfolioRepository,
    private readonly mapper: PortfolioMapper,
  ) {}

  async execute(query: ListPositionsQuery): Promise<PositionListResponseDto> {
    const portfolio = await this.portfolioRepository.findById(DEFAULT_PORTFOLIO_ID);
    if (!portfolio) throw new UnknownPortfolioError(DEFAULT_PORTFOLIO_ID);

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(portfolio.positions, page, pageSize);

    const dto = new PositionListResponseDto();
    dto.items = this.mapper.toPositionDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}

@QueryHandler(ListTradesQuery)
export class ListTradesHandler implements IQueryHandler<ListTradesQuery, TradeListResponseDto> {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY) private readonly portfolioRepository: PortfolioRepository,
    private readonly mapper: PortfolioMapper,
  ) {}

  async execute(query: ListTradesQuery): Promise<TradeListResponseDto> {
    const trades = await this.portfolioRepository.findTradesByPortfolio(DEFAULT_PORTFOLIO_ID);

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(trades, page, pageSize);

    const dto = new TradeListResponseDto();
    dto.items = this.mapper.toTradeDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}
