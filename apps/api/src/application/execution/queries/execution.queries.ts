import type { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListOrdersQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}

export class ListExecutionsQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}
