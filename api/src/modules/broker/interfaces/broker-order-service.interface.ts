import type { BrokerOrderRequest, BrokerOrderModification, BrokerOrderResult } from "./broker-models";

/** BR-001's Order Service section: Market Buy/Sell, Buy/Sell Limit, Buy/Sell Stop (all `BrokerOrderType` values, chosen via `BrokerOrderRequest.type`), Stop Loss/Take Profit (fields on the same request), Modify Order, Cancel Order. */
export interface BrokerOrderService {
  placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult>;
  modifyOrder(orderId: string, changes: BrokerOrderModification): Promise<BrokerOrderResult>;
  cancelOrder(orderId: string): Promise<BrokerOrderResult>;
}
