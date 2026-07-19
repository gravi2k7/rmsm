import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { CreateStrategyDto } from "./dto/create-strategy.dto";
import { UpdateStrategyDto } from "./dto/update-strategy.dto";
import { StrategyResponseDto } from "./dto/strategy-response.dto";
import { StrategyListResponseDto } from "./dto/strategy-list-response.dto";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CreateStrategyCommand } from "./commands/create-strategy.command";
import { UpdateStrategyCommand } from "./commands/update-strategy.command";
import { DeleteStrategyCommand } from "./commands/delete-strategy.command";
import { ListStrategiesQuery, GetStrategyByIdQuery } from "./queries/strategy.queries";

/**
 * No business logic here — every handler method does exactly one thing:
 * build a Command/Query from the request and dispatch it via
 * `CommandBus`/`QueryBus`. All real logic (validation, domain rules,
 * persistence) lives in the CQRS handlers and the `@rmsm/strategy`
 * domain package itself, per Phase 4A's own explicit rule.
 */
@ApiTags("Strategies")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("strategies")
export class StrategyController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermissions("strategies.read")
  @ApiOperation({ summary: "List strategies, paginated." })
  list(@Query() query: PaginationQueryDto): Promise<StrategyListResponseDto> {
    return this.queryBus.execute(new ListStrategiesQuery(query));
  }

  @Get(":id")
  @RequirePermissions("strategies.read")
  @ApiOperation({ summary: "Get a strategy by id." })
  getById(@Param("id", ParseUUIDPipe) id: string): Promise<StrategyResponseDto> {
    return this.queryBus.execute(new GetStrategyByIdQuery(id));
  }

  @Post()
  @RequirePermissions("strategies.write")
  @ApiOperation({ summary: "Create a new strategy (starts in DRAFT, disabled)." })
  create(@Body() dto: CreateStrategyDto): Promise<StrategyResponseDto> {
    return this.commandBus.execute(new CreateStrategyCommand(dto));
  }

  @Put(":id")
  @RequirePermissions("strategies.write")
  @ApiOperation({ summary: "Update a strategy's lifecycle status and/or enabled flag." })
  update(@Param("id", ParseUUIDPipe) id: string, @Body() dto: UpdateStrategyDto): Promise<StrategyResponseDto> {
    return this.commandBus.execute(new UpdateStrategyCommand(id, dto));
  }

  @Delete(":id")
  @RequirePermissions("strategies.write")
  @ApiOperation({ summary: "Archive a strategy (no hard deletes, per platform convention)." })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.commandBus.execute(new DeleteStrategyCommand(id));
  }
}
