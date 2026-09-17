import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { ExecutionFactory, Execution } from "@rmsm/execution";
import type { ExecutionRepository } from "@rmsm/execution";
import { CreateOrderCommand } from "../commands/create-order.command";
import { EXECUTION_REPOSITORY } from "../execution.tokens";
import { ExecutionMapper } from "../mappers/execution.mapper";
import type { OrderResponseDto } from "../dto/execution.dto";
import { DemoOrderExecutionService } from "../services/demo-order-execution.service";

/** Default retry budget for an execution attempt — this phase has no
 * configuration source for a per-strategy/per-order retry policy, so a
 * single, documented platform default is used rather than a value
 * invented per call site. A real retry-policy configuration surface is
 * exactly the kind of thing a later phase's own settings/config module
 * would own. */
const DEFAULT_MAX_RETRIES = 3;

@CommandHandler(CreateOrderCommand)
export class CreateOrderHandler implements ICommandHandler<CreateOrderCommand, OrderResponseDto> {
  constructor(
    @Inject(EXECUTION_REPOSITORY) private readonly executionRepository: ExecutionRepository,
    private readonly mapper: ExecutionMapper,
    private readonly demoOrderExecutionService: DemoOrderExecutionService,
  ) {}

  async execute(command: CreateOrderCommand): Promise<OrderResponseDto> {
    const { dto } = command;

    const result = ExecutionFactory.createOrder({
      decisionId: dto.decisionId,
      symbolCode: dto.symbolCode,
      side: dto.side,
      type: dto.type,
      quantityUnits: dto.quantityUnits,
      limitPriceAmount: dto.limitPrice,
      stopPriceAmount: dto.stopPrice,
      pricePrecision: dto.pricePrecision,
    });
    if (!result.ok) throw result.error;

    const order = result.value;
    await this.executionRepository.saveOrder(order);

    const execution = Execution.start(
      randomUUID(),
      order.id,
      DEFAULT_MAX_RETRIES,
    );
    await this.executionRepository.saveExecution(execution);

    const executedOrder =
      await this.demoOrderExecutionService.execute(order);

    return this.mapper.toOrderDto(executedOrder);
  }
}
