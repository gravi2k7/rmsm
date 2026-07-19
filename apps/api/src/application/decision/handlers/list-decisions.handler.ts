import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import type { DecisionRepository, Decision, DecisionStatus } from "@rmsm/decision";
import { ListDecisionsQuery } from "../queries/list-decisions.query";
import { DECISION_REPOSITORY } from "../decision.tokens";
import { DecisionMapper } from "../mappers/decision.mapper";
import { DecisionListResponseDto } from "../dto/decision.dto";
import { paginateArray } from "../../common/dto/pagination.dto";

const ALL_STATUSES: readonly DecisionStatus[] = ["PENDING", "APPROVED", "REJECTED", "MANUAL_REVIEW"];

@QueryHandler(ListDecisionsQuery)
export class ListDecisionsHandler implements IQueryHandler<ListDecisionsQuery, DecisionListResponseDto> {
  constructor(
    @Inject(DECISION_REPOSITORY) private readonly decisionRepository: DecisionRepository,
    private readonly mapper: DecisionMapper,
  ) {}

  async execute(query: ListDecisionsQuery): Promise<DecisionListResponseDto> {
    const perStatus = await Promise.all(ALL_STATUSES.map((status) => this.decisionRepository.findByStatus(status)));
    const all: Decision[] = perStatus.flat();

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new DecisionListResponseDto();
    dto.items = this.mapper.toResponseDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}
