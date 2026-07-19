import type { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListOpportunitiesQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}
