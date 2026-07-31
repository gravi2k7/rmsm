import { Injectable } from "@nestjs/common";
import type { BrokerHistoryService } from "../../interfaces/broker-history-service.interface";
import type { BrokerDateRange, BrokerOrderRecord, BrokerDealRecord } from "../../interfaces/broker-models";
import type { BrokerOrderStatus, BrokerOrderType } from "../../contracts/broker.contracts";
import { MetaTrader5Client } from "./metatrader5.client";
import type { Mt5OrderHistoryResponse, Mt5DealHistoryResponse } from "./metatrader5.types";

/** BR-001's History Service section: Order History, Deal History, Trade History, with date filtering — see `BrokerHistoryService`'s own doc comment for why "Trade History" is not a third method. */
@Injectable()
export class MetaTrader5HistoryService implements BrokerHistoryService {
  constructor(private readonly client: MetaTrader5Client) {}

  async getOrderHistory(range: BrokerDateRange): Promise<BrokerOrderRecord[]> {
    const params = this.dateParams(range);
    const raw = await this.client.request<Mt5OrderHistoryResponse[]>("GET", `/history/orders?${params.toString()}`);
    return raw.map((o) => ({
      orderId: o.orderId,
      symbol: o.symbol,
      type: o.type as BrokerOrderType,
      volume: o.volume,
      price: o.price,
      status: o.status as BrokerOrderStatus,
      placedAt: new Date(o.timeSetup),
    }));
  }

  async getDealHistory(range: BrokerDateRange): Promise<BrokerDealRecord[]> {
    const params = this.dateParams(range);
    const raw = await this.client.request<Mt5DealHistoryResponse[]>("GET", `/history/deals?${params.toString()}`);
    return raw.map((d) => ({
      dealId: d.dealId,
      orderId: d.orderId,
      symbol: d.symbol,
      volume: d.volume,
      price: d.price,
      profit: d.profit,
      commission: d.commission,
      swap: d.swap,
      executedAt: new Date(d.time),
    }));
  }

  private dateParams(range: BrokerDateRange): URLSearchParams {
    return new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
  }
}
