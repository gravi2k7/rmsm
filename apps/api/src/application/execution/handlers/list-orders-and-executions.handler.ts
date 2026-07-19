import { QueryHandler, IQueryHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import type { ExecutionRepository, Order, OrderStatus, Execution } from "@rmsm/execution";
import { ListOrdersQuery, ListExecutionsQuery } from "../queries/execution.queries";
import { EXECUTION_REPOSITORY } from "../execution.tokens";
import { ExecutionMapper } from "../mappers/execution.mapper";
import { OrderListResponseDto, ExecutionListResponseDto } from "../dto/execution.dto";
import { paginateArray } from "../../common/dto/pagination.dto";

const ALL_ORDER_STATUSES: readonly OrderStatus[] = ["PENDING", "SUBMITTED", "ACCEPTED", "PARTIALLY_FILLED", "FILLED", "CANCELLED", "REJECTED", "EXPIRED"];

/** `ExecutionRepository` has no `findAll()` for orders either — every
 * status is queried and merged, same pattern as every other domain's own
 * list handler in this application layer. */
async function findAllOrders(repository: ExecutionRepository): Promise<Order[]> {
  const perStatus = await Promise.all(ALL_ORDER_STATUSES.map((status) => repository.findOrdersByStatus(status)));
  return perStatus.flat();
}

@QueryHandler(ListOrdersQuery)
export class ListOrdersHandler implements IQueryHandler<ListOrdersQuery, OrderListResponseDto> {
  constructor(
    @Inject(EXECUTION_REPOSITORY) private readonly executionRepository: ExecutionRepository,
    private readonly mapper: ExecutionMapper,
  ) {}

  async execute(query: ListOrdersQuery): Promise<OrderListResponseDto> {
    const all = await findAllOrders(this.executionRepository);
    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new OrderListResponseDto();
    dto.items = this.mapper.toOrderDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}

/**
 * `ExecutionRepository` has no way to list every `Execution` directly
 * (only `findExecutionById`/`findExecutionByOrderId`) — a genuine
 * interface gap this phase can't close (no domain-package changes
 * allowed). Every `Execution` is created *for* an `Order`
 * (`Execution.start(id, orderId, ...)`), so this handler derives "every
 * execution" by first listing every order (the same way
 * `ListOrdersHandler` does, using only interface methods), then looking
 * up each order's own execution — architecturally sound, just an
 * indirect path through the one relationship the interface *does*
 * expose. Flagged in `PERSISTENCE_ROADMAP.md` as something a real
 * implementation should give a direct index for.
 */
@QueryHandler(ListExecutionsQuery)
export class ListExecutionsHandler implements IQueryHandler<ListExecutionsQuery, ExecutionListResponseDto> {
  constructor(
    @Inject(EXECUTION_REPOSITORY) private readonly executionRepository: ExecutionRepository,
    private readonly mapper: ExecutionMapper,
  ) {}

  async execute(query: ListExecutionsQuery): Promise<ExecutionListResponseDto> {
    const orders = await findAllOrders(this.executionRepository);
    const perOrder = await Promise.all(orders.map((o) => this.executionRepository.findExecutionByOrderId(o.id)));
    const all: Execution[] = perOrder.filter((e): e is Execution => e !== null);

    const page = query.query.page ?? 1;
    const pageSize = query.query.pageSize ?? 50;
    const paginated = paginateArray(all, page, pageSize);

    const dto = new ExecutionListResponseDto();
    dto.items = this.mapper.toExecutionDtoList(paginated.items);
    dto.total = paginated.total;
    dto.page = paginated.page;
    dto.pageSize = paginated.pageSize;
    return dto;
  }
}
