import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { QueryBus } from "@nestjs/cqrs";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { OpportunityListResponseDto } from "./dto/opportunity-response.dto";
import { ListOpportunitiesQuery } from "./queries/list-opportunities.query";

@ApiTags("Opportunities")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("opportunities")
export class OpportunityController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermissions("opportunities.read")
  @ApiOperation({ summary: "List trade opportunities, paginated." })
  list(@Query() query: PaginationQueryDto): Promise<OpportunityListResponseDto> {
    return this.queryBus.execute(new ListOpportunitiesQuery(query));
  }
}
