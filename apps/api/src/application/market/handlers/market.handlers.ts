import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { SymbolCode, UnknownExchangeError } from "@rmsm/market";
import type { ExchangeRepository, SymbolRepository, MarketRepository } from "@rmsm/market";
import { ListExchangesQuery, GetExchangeByIdQuery, ListSymbolsQuery, ListCandlesQuery } from "../queries/market.queries";
import { EXCHANGE_REPOSITORY, SYMBOL_REPOSITORY, MARKET_REPOSITORY } from "../market.tokens";
import { MarketMapper } from "../mappers/market.mapper";
import { ExchangeListResponseDto, SymbolListResponseDto, CandleListResponseDto } from "../dto/market-response.dto";
import type { ExchangeResponseDto } from "../dto/market-response.dto";
import { paginateArray } from "../../common/dto/pagination.dto";

@QueryHandler(ListExchangesQuery)
export class ListExchangesHandler implements IQueryHandler<ListExchangesQuery, ExchangeListResponseDto> {
  constructor(
    @Inject(EXCHANGE_REPOSITORY) private readonly exchangeRepository: ExchangeRepository,
    private readonly mapper: MarketMapper,
  ) {}

  async execute(query: ListExchangesQuery): Promise<ExchangeListResponseDto> {
    const all = await this.exchangeRepository.findAll();
    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new ExchangeListResponseDto();
    dto.items = paginated.items.map((e) => this.mapper.toExchangeDto(e));
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}

@QueryHandler(GetExchangeByIdQuery)
export class GetExchangeByIdHandler implements IQueryHandler<GetExchangeByIdQuery, ExchangeResponseDto> {
  constructor(
    @Inject(EXCHANGE_REPOSITORY) private readonly exchangeRepository: ExchangeRepository,
    private readonly mapper: MarketMapper,
  ) {}

  async execute(query: GetExchangeByIdQuery): Promise<ExchangeResponseDto> {
    const exchange = await this.exchangeRepository.findById(query.exchangeId);
    if (!exchange) throw new UnknownExchangeError(query.exchangeId);
    return this.mapper.toExchangeDto(exchange);
  }
}

@QueryHandler(ListSymbolsQuery)
export class ListSymbolsHandler implements IQueryHandler<ListSymbolsQuery, SymbolListResponseDto> {
  constructor(
    @Inject(SYMBOL_REPOSITORY) private readonly symbolRepository: SymbolRepository,
    private readonly mapper: MarketMapper,
  ) {}

  async execute(query: ListSymbolsQuery): Promise<SymbolListResponseDto> {
    // SymbolRepository has no findAll() either (findByAssetClass/
    // findByExchange only) — every asset class this platform supports is
    // queried and merged, the same "no findAll on the interface" pattern
    // `strategy`'s own list handler documents.
    const assetClasses = ["FOREX", "FUTURES", "EQUITY", "INDEX", "CRYPTO", "COMMODITY", "OPTION", "BOND", "ETF"] as const;
    const perClass = await Promise.all(assetClasses.map((ac) => this.symbolRepository.findByAssetClass(ac)));
    const all = perClass.flat();

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new SymbolListResponseDto();
    dto.items = paginated.items.map((s) => this.mapper.toSymbolDto(s));
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}

@QueryHandler(ListCandlesQuery)
export class ListCandlesHandler implements IQueryHandler<ListCandlesQuery, CandleListResponseDto> {
  constructor(
    @Inject(MARKET_REPOSITORY) private readonly marketRepository: MarketRepository,
    private readonly mapper: MarketMapper,
  ) {}

  async execute(query: ListCandlesQuery): Promise<CandleListResponseDto> {
    const symbolCodeResult = SymbolCode.create(query.query.symbolCode);
    if (!symbolCodeResult.ok) throw symbolCodeResult.error;

    const to = query.query.to ? new Date(query.query.to) : new Date();
    const from = query.query.from ? new Date(query.query.from) : new Date(to.getTime() - 24 * 60 * 60 * 1000);

    const candles = await this.marketRepository.getCandles(symbolCodeResult.value, query.query.timeframe, from, to);

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(candles, page, pageSize);

    const dto = new CandleListResponseDto();
    dto.items = paginated.items.map((c) => this.mapper.toCandleDto(c));
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}
