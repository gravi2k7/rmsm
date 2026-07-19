import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import type { OpportunityRepository, Opportunity, OpportunityStatus } from "@rmsm/opportunity";
import { ListOpportunitiesQuery } from "../queries/list-opportunities.query";
import { OPPORTUNITY_REPOSITORY } from "../opportunity.tokens";
import { OpportunityMapper } from "../mappers/opportunity.mapper";
import { OpportunityListResponseDto } from "../dto/opportunity-response.dto";
import { paginateArray } from "../../common/dto/pagination.dto";

const ALL_STATUSES: readonly OpportunityStatus[] = ["PENDING", "CONFIRMED", "EXPIRED", "REJECTED"];

@QueryHandler(ListOpportunitiesQuery)
export class ListOpportunitiesHandler implements IQueryHandler<ListOpportunitiesQuery, OpportunityListResponseDto> {
  constructor(
    @Inject(OPPORTUNITY_REPOSITORY) private readonly opportunityRepository: OpportunityRepository,
    private readonly mapper: OpportunityMapper,
  ) {}

  async execute(query: ListOpportunitiesQuery): Promise<OpportunityListResponseDto> {
    const perStatus = await Promise.all(ALL_STATUSES.map((status) => this.opportunityRepository.findByStatus(status)));
    const all: Opportunity[] = perStatus.flat();

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new OpportunityListResponseDto();
    dto.items = this.mapper.toResponseDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}
