import type { ExecutionPlan } from "../entities/execution-plan";
import type { Order } from "../entities/order";

/**
 * The port to a higher-level execution engine — distinct from `Broker`:
 * a `Broker` is one direct venue connection, while an `ExecutionEngine`
 * is whatever decides *which* broker(s) to route an `ExecutionPlan`'s
 * own orders through (smart order routing, multi-venue splitting), which
 * this domain has no way to implement itself without real infrastructure
 * (venue connectivity, live liquidity data). `OrderRoutingService` is
 * this domain's own consumer of this port.
 */
export interface ExecutionEngine {
  /** Realizes an `ExecutionPlan` as one or more concrete `Order`s,
   * already routed to wherever the engine decided they should go. */
  realizePlan(plan: ExecutionPlan): Promise<Order[]>;
}
