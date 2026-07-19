import { ok, err, type Result } from "@rmsm/core";
import type { ExecutionEngine } from "../interfaces/execution-engine.interface";
import type { Broker } from "../interfaces/broker.interface";
import type { ExecutionPlan } from "../entities/execution-plan";
import type { Order } from "../entities/order";
import { OrderRoutingError } from "../errors/execution.errors";

/**
 * The order-routing abstraction this domain's own required feature list
 * names — decides how an `ExecutionPlan` becomes real, submitted
 * `Order`s, delegating the actual venue decision to `ExecutionEngine`
 * and the actual submission to `Broker` (both interfaces, constructor-
 * injected; this service never talks to a concrete broker SDK).
 */
export class OrderRoutingService {
  constructor(
    private readonly executionEngine: ExecutionEngine,
    private readonly broker: Broker,
  ) {}

  /** Realizes a plan into orders (via `ExecutionEngine`), then submits
   * each one (via `Broker`), calling `Order.submit()` only for the ones
   * the broker actually accepted — a rejected submission is recorded via
   * `Order.reject()` instead, so a caller inspecting the returned orders
   * sees each one's real, individual outcome rather than an all-or-
   * nothing result for the whole plan. */
  async route(plan: ExecutionPlan): Promise<Result<Order[], OrderRoutingError>> {
    let orders: Order[];
    try {
      orders = await this.executionEngine.realizePlan(plan);
    } catch (error) {
      return err(new OrderRoutingError(error instanceof Error ? error.message : String(error)));
    }

    if (orders.length === 0) {
      return err(new OrderRoutingError(`execution engine returned no orders for plan ${plan.id}.`));
    }

    for (const order of orders) {
      order.submit();
      const ack = await this.broker.submitOrder(order);
      if (ack.accepted) {
        order.accept();
      } else {
        order.reject();
      }
    }

    return ok(orders);
  }
}
