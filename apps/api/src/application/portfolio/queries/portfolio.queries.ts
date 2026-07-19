import type { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class GetPortfolioQuery {}

export class ListPositionsQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}

export class ListTradesQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}
