import { Injectable, Logger } from "@nestjs/common";
import type { BrokerOrderService } from "../../interfaces/broker-order-service.interface";
import type { BrokerOrderRequest, BrokerOrderModification, BrokerOrderResult } from "../../interfaces/broker-models";
import type { BrokerOrderStatus, BrokerOrderType } from "../../contracts/broker.contracts";
import { MetaTrader5Client } from "./metatrader5.client";
import type { Mt5OrderRequestPayload, Mt5OrderResponse } from "./metatrader5.types";

/** BR-001's Order Service section: Market Buy/Sell, Buy/Sell Limit, Buy/Sell Stop, Stop Loss/Take Profit, Modify Order, Cancel Order. Every log line includes the symbol/type/volume of an order but never account credentials — orders themselves aren't secrets, matching BR-001's own Logging section ("Log: ... Orders ...", "Do NOT log passwords" — passwords specifically, not order details). */
@Injectable()
export class MetaTrader5OrderService implements BrokerOrderService {
  private readonly logger = new Logger(MetaTrader5OrderService.name);

  constructor(private readonly client: MetaTrader5Client) {}

  async placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult> {
    this.logger.log({ msg: "mt5.order.place", symbol: request.symbol, type: request.type, volume: request.volume });
    const payload: Mt5OrderRequestPayload = {
      symbol: request.symbol,
      type: request.type,
      volume: request.volume,
      price: request.price,
      sl: request.stopLoss,
      tp: request.takeProfit,
      comment: request.comment,
    };
    const raw = await this.client.request<Mt5OrderResponse>("POST", "/orders", payload);
    const result = this.toOrderResult(raw);
    this.logger.log({ msg: "mt5.order.placed", orderId: result.orderId, status: result.status });
    return result;
  }

  async modifyOrder(orderId: string, changes: BrokerOrderModification): Promise<BrokerOrderResult> {
    this.logger.log({ msg: "mt5.order.modify", orderId });
    const raw = await this.client.request<Mt5OrderResponse>("PUT", `/orders/${encodeURIComponent(orderId)}`, { price: changes.price, sl: changes.stopLoss, tp: changes.takeProfit });
    return this.toOrderResult(raw);
  }

  async cancelOrder(orderId: string): Promise<BrokerOrderResult> {
    this.logger.log({ msg: "mt5.order.cancel", orderId });
    const raw = await this.client.request<Mt5OrderResponse>("DELETE", `/orders/${encodeURIComponent(orderId)}`);
    return this.toOrderResult(raw);
  }

  private toOrderResult(raw: Mt5OrderResponse): BrokerOrderResult {
    return {
      orderId: raw.orderId,
      status: raw.status as BrokerOrderStatus,
      symbol: raw.symbol,
      type: raw.type as BrokerOrderType,
      volume: raw.volume,
      price: raw.price,
      message: raw.message,
    };
  }
}
