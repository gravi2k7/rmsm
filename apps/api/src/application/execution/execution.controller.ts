import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { PaginationQueryDto } from "../common/dto/pagination.dto";
import { CreateOrderDto, OrderResponseDto, OrderListResponseDto, ExecutionListResponseDto } from "./dto/execution.dto";
import { CreateOrderCommand } from "./commands/create-order.command";
import { ListOrdersQuery, ListExecutionsQuery } from "./queries/execution.queries";

@ApiTags("Execution")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller()
export class ExecutionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post("orders")
  @RequirePermissions("executions.write")
  @ApiOperation({ summary: "Place an order for an approved decision." })
  createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.commandBus.execute(new CreateOrderCommand(dto));
  }

  @Get("orders")
  @RequirePermissions("executions.read")
  @ApiOperation({ summary: "List orders, paginated." })
  listOrders(@Query() query: PaginationQueryDto): Promise<OrderListResponseDto> {
    return this.queryBus.execute(new ListOrdersQuery(query));
  }

  @Get("executions")
  @RequirePermissions("executions.read")
  @ApiOperation({ summary: "List execution attempts, paginated." })
  listExecutions(@Query() query: PaginationQueryDto): Promise<ExecutionListResponseDto> {
    return this.queryBus.execute(new ListExecutionsQuery(query));
  }
}
