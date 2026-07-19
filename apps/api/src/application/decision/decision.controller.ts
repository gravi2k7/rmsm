import { Body, Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../modules/auth/services/token.service";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { ApproveDecisionDto, RejectDecisionDto, DecisionResponseDto, DecisionListResponseDto } from "./dto/decision.dto";
import { ListDecisionsQuery } from "./queries/list-decisions.query";
import { ApproveDecisionCommand, RejectDecisionCommand } from "./commands/decision.commands";

@ApiTags("Decisions")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("decisions")
export class DecisionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermissions("decisions.read")
  @ApiOperation({ summary: "List risk decisions, paginated." })
  list(@Query() query: PaginationQueryDto): Promise<DecisionListResponseDto> {
    return this.queryBus.execute(new ListDecisionsQuery(query));
  }

  @Put(":id/approve")
  @RequirePermissions("decisions.approve")
  @ApiOperation({ summary: "Approve a decision — only succeeds if its own risk assessment passed." })
  approve(@Param("id") id: string, @Body() dto: ApproveDecisionDto, @CurrentUser() user: AccessTokenPayload): Promise<DecisionResponseDto> {
    return this.commandBus.execute(new ApproveDecisionCommand(id, user.sub, dto));
  }

  @Put(":id/reject")
  @RequirePermissions("decisions.approve")
  @ApiOperation({ summary: "Reject a decision." })
  reject(@Param("id") id: string, @Body() dto: RejectDecisionDto, @CurrentUser() user: AccessTokenPayload): Promise<DecisionResponseDto> {
    return this.commandBus.execute(new RejectDecisionCommand(id, user.sub, dto));
  }
}
