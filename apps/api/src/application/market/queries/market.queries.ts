import type { PaginationQueryDto } from "../../common/dto/pagination.dto";
import type { CandleQueryDto } from "../dto/candle-query.dto";

export class ListExchangesQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}

export class GetExchangeByIdQuery {
  constructor(public readonly exchangeId: string) {}
}

export class ListSymbolsQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}

export class ListCandlesQuery {
  constructor(public readonly query: CandleQueryDto) {}
}
