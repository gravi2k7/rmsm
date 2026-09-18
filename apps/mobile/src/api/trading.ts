import { ApiClient } from "./client";

export type ManualOrderSide = "BUY" | "SELL";

export type ManualOrderRequest = {
  instrumentId: string;
  side: ManualOrderSide;
  quantityUnits: number;
};

export type ManualOrderResponse = {
  orderId: string;
  portfolioId: string;
  instrumentId: string;
  symbolCode: string;
  side: ManualOrderSide;
  type: "MARKET";
  quantity: number;
  executionPrice: number;
  status: "FILLED" | "CLOSED";
  positionId?: string;
  tradeId?: string;
  realizedPnl?: number;
  bid: number;
  ask: number;
  executedAt: string;
};

export class TradingApi {
  constructor(private readonly client: ApiClient) {}

  executeMarketOrder(
    request: ManualOrderRequest,
  ): Promise<ManualOrderResponse> {
    return this.client.request<ManualOrderResponse>(
      "trading/orders",
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }
}
