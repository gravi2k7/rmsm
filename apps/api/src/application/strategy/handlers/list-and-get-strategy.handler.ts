import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { StrategyId, UnknownStrategyError, type Strategy, type StrategyLifecycleStatus } from "@rmsm/strategy";
import { ListStrategiesQuery, GetStrategyByIdQuery } from "../queries/strategy.queries";
import { STRATEGY_REPOSITORY } from "../strategy.tokens";
import type { StrategyRepository } from "@rmsm/strategy";
import { StrategyMapper } from "../mappers/strategy.mapper";
import { StrategyListResponseDto } from "../dto/strategy-list-response.dto";
import type { StrategyResponseDto } from "../dto/strategy-response.dto";
import { paginateArray } from "../../common/dto/pagination.dto";

/** Every status `StrategyLifecycleStatus` can hold — `StrategyRepository`
 * has no `findAll()` (see `strategy.memory-repository.ts`'s own doc
 * comment for why), so "every strategy regardless of status" is built by
 * querying each status this domain actually has and merging — using only
 * the interface's own methods, no adapter-specific escape hatch. */
const ALL_STATUSES: readonly StrategyLifecycleStatus[] = ["DRAFT", "TESTING", "PAPER_TRADING", "PRODUCTION", "ARCHIVED"];

@QueryHandler(ListStrategiesQuery)
export class ListStrategiesHandler implements IQueryHandler<ListStrategiesQuery, StrategyListResponseDto> {
  constructor(
    @Inject(STRATEGY_REPOSITORY) private readonly strategyRepository: StrategyRepository,
    private readonly mapper: StrategyMapper,
  ) {}

  async execute(query: ListStrategiesQuery): Promise<StrategyListResponseDto> {
    const perStatus = await Promise.all(ALL_STATUSES.map((status) => this.strategyRepository.findByStatus(status)));
    let all: Strategy[] = perStatus.flat();

    if (query.query.search) {
      const term = query.query.search.toLowerCase();
      all = all.filter((s) => s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term));
    }

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new StrategyListResponseDto();
    dto.items = this.mapper.toResponseDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}

@QueryHandler(GetStrategyByIdQuery)
export class GetStrategyByIdHandler implements IQueryHandler<GetStrategyByIdQuery, StrategyResponseDto> {
  constructor(
    @Inject(STRATEGY_REPOSITORY) private readonly strategyRepository: StrategyRepository,
    private readonly mapper: StrategyMapper,
  ) {}

  async execute(query: GetStrategyByIdQuery): Promise<StrategyResponseDto> {
    const idResult = StrategyId.create(query.strategyId);
    if (!idResult.ok) throw idResult.error;

    const strategy = await this.strategyRepository.findById(idResult.value);
    if (!strategy) throw new UnknownStrategyError(query.strategyId);

    return this.mapper.toResponseDto(strategy);
  }
}
