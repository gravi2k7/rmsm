import { Inject, Injectable } from "@nestjs/common";
import type {
  Broker,
  ExecutionRepository,
  Order,
} from "@rmsm/execution";
import { ExecutionService } from "@rmsm/execution";
import { EXECUTION_REPOSITORY } from "../execution.tokens";

export const DEMO_BROKER = Symbol("DEMO_BROKER");

@Injectable()
export class DemoOrderExecutionService {
  constructor(
    @Inject(EXECUTION_REPOSITORY)
    private readonly executionRepository: ExecutionRepository,
    @Inject(DEMO_BROKER)
    private readonly broker: Broker,
    private readonly executionService: ExecutionService,
  ) {}

  async execute(order: Order): Promise<Order> {
    order.submit();
    await this.executionRepository.saveOrder(order);

    const ack = await this.broker.submitOrder(order);

    if (!ack.accepted) {
      order.reject();
      await this.executionRepository.saveOrder(order);

      const execution = await this.executionRepository.findExecutionByOrderId(
        order.id,
      );

      if (!execution) {
        throw new Error(
          `No execution found for rejected order ${order.id}.`,
        );
      }

      execution.fail(
        ack.rejectionReason ?? "DEMO broker rejected the order.",
      );
      await this.executionRepository.saveExecution(execution);

      return order;
    }

    order.accept();
    await this.executionRepository.saveOrder(order);

    const execution = await this.executionRepository.findExecutionByOrderId(
      order.id,
    );

    if (!execution) {
      throw new Error(
        `No execution found for accepted order ${order.id}.`,
      );
    }

    const result = await this.executionService.pollAndApplyFills(
      execution.id,
    );

    if (!result.ok) {
      throw result.error;
    }

    return result.value.order;
  }
}
