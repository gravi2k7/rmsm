import { ok, err, type Result } from "@rmsm/core";
import type { ExecutionRepository } from "../repositories/execution.repository";
import type { Broker } from "../interfaces/broker.interface";
import type { Execution } from "../entities/execution";
import type { Order } from "../entities/order";
import { UnknownExecutionError, UnknownOrderError, InvalidExecutionError } from "../errors/execution.errors";

/**
 * Orchestrates an `Execution`'s own lifecycle — polling `Broker` for new
 * fills, applying them to the underlying `Order`, and marking the
 * `Execution` complete/failed once the order reaches a terminal status.
 * Depends on `ExecutionRepository` and `Broker` (both interfaces,
 * constructor-injected), never a concrete persistence or broker
 * technology.
 */
export class ExecutionService {
  constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly broker: Broker,
  ) {}

  async getExecution(id: string): Promise<Result<Execution, UnknownExecutionError>> {
    const execution = await this.executionRepository.findExecutionById(id);
    if (!execution) return err(new UnknownExecutionError(id));
    return ok(execution);
  }

  /** Polls the broker for new fills on the execution's own order,
   * applies each to the order, and — if the order reached a terminal
   * status as a result — completes or fails the execution accordingly.
   * Returns the updated `Order` alongside the `Execution` so a caller
   * doesn't need a second round-trip to see the order's own new state. */
  async pollAndApplyFills(executionId: string): Promise<Result<{ execution: Execution; order: Order }, UnknownExecutionError | UnknownOrderError>> {
    const executionResult = await this.getExecution(executionId);
    if (!executionResult.ok) return executionResult;
    const execution = executionResult.value;

    const order = await this.executionRepository.findOrderById(execution.orderId);
    if (!order) return err(new UnknownOrderError(execution.orderId));

    const newFills = await this.broker.getFills(order.id);
    for (const fill of newFills) {
      order.applyFill(fill);
    }
    await this.executionRepository.saveOrder(order);

    if (order.status === "FILLED") {
      execution.complete();
    } else if (order.status === "CANCELLED" || order.status === "REJECTED" || order.status === "EXPIRED") {
      execution.fail(`order reached terminal status "${order.status}" without filling.`);
    }
    await this.executionRepository.saveExecution(execution);

    return ok({ execution, order });
  }

  /** Cancels the underlying order via `Broker` and marks the execution
   * failed — cancellation is always a failure to *complete* the original
   * intent, even though it's a deliberate, successful cancel operation
   * in isolation. */
  async cancel(executionId: string): Promise<Result<Execution, UnknownExecutionError | UnknownOrderError | InvalidExecutionError>> {
    const executionResult = await this.getExecution(executionId);
    if (!executionResult.ok) return executionResult;
    const execution = executionResult.value;

    const order = await this.executionRepository.findOrderById(execution.orderId);
    if (!order) return err(new UnknownOrderError(execution.orderId));

    const cancelled = await this.broker.cancelOrder(order.id);
    if (!cancelled) {
      return err(new InvalidExecutionError(`broker refused to cancel order ${order.id}.`));
    }

    order.cancel();
    execution.fail("cancelled by request.");
    await this.executionRepository.saveOrder(order);
    await this.executionRepository.saveExecution(execution);

    return ok(execution);
  }
}
