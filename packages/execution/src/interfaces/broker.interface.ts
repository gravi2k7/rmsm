import type { Order } from "../entities/order";
import type { Fill } from "../entities/fill";

export interface BrokerOrderAck {
  readonly accepted: boolean;
  readonly brokerOrderId?: string;
  readonly rejectionReason?: string;
}

/**
 * The port to a real broker/venue connection — implemented entirely
 * outside this package (per its own design rules: "No broker
 * implementation. No MT5. No TradingView."). `OrderRoutingService` and
 * `ExecutionService` depend on this; neither ever talks to a broker SDK
 * directly.
 */
export interface Broker {
  submitOrder(order: Order): Promise<BrokerOrderAck>;
  cancelOrder(orderId: string): Promise<boolean>;
  /** Polls the broker for any fills that have occurred since the order
   * was last checked — the pull-based counterpart to a push-based fill
   * stream a real implementation might also offer. */
  getFills(orderId: string): Promise<Fill[]>;
}
