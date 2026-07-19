import type { PaginationQueryDto } from "../../common/dto/pagination.dto";

export class ListDecisionsQuery {
  constructor(public readonly query: PaginationQueryDto) {}
}
