import type { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListStrategiesQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}

export class GetStrategyByIdQuery {
  constructor(public readonly strategyId: string) {}
}
