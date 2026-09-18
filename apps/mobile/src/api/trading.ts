import { ApiClient } from "./client";

export type TradingAccount = {
  id: string;
  organizationId: string;
  ownerUserId: string;
  type: "DEMO" | string;
  name: string;
  currency: string;
  startingBalance: string | null;
  balance: string;
  leverage: string;
  status: string;
  brokerConnectionId: string | null;
  brokerAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type TradingOrder = {
  id: string;
  accountId: string;
  instrumentId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: string;
  status: string;
  requestedPrice: string | null;
  executedPrice: string | null;
  rejectionReason: string | null;
  createdAt: string;
  filledAt: string | null;
  limitPrice: string | null;
  stopPrice: string | null;
  triggeredAt: string | null;
  stopLossPrice?: string | null;
  takeProfitPrice?: string | null;
};

export type TradingPosition = {
  id: string;
  accountId: string;
  instrumentId: string;
  side: "LONG" | "SHORT";
  quantity: string;
  averageEntryPrice: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  averageExitPrice: string | null;
  realizedPnl: string | null;
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
};

export type TradingTrade = {
  id: string;
  accountId: string;
  instrumentId: string;
  side: "BUY" | "SELL";
  quantity: string;
  entryPrice: string;
  exitPrice: string | null;
  realizedPnl: string | null;
  openedAt: string;
  closedAt: string | null;
};

export type PlaceOrderRequest = {
  instrumentId: string;
  side: "BUY" | "SELL";
  type?: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: string;
  limitPrice?: string;
  stopPrice?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
};

export type UpdatePendingOrderRequest = {
  quantity?: string;
  limitPrice?: string;
  stopPrice?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
};

export class TradingApi {
  constructor(private readonly client: ApiClient) {}

  listAccounts(organizationId: string): Promise<TradingAccount[]> {
    return this.client.request<TradingAccount[]>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts`,
    );
  }

  getAccount(
    organizationId: string,
    accountId: string,
  ): Promise<TradingAccount> {
    return this.client.request<TradingAccount>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(accountId)}`,
    );
  }

  listOrders(
    organizationId: string,
    accountId: string,
  ): Promise<TradingOrder[]> {
    return this.client.request<TradingOrder[]>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(accountId)}/orders`,
    );
  }

  listPositions(
    organizationId: string,
    accountId: string,
  ): Promise<TradingPosition[]> {
    return this.client.request<TradingPosition[]>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(accountId)}/positions`,
    );
  }

  listTrades(
    organizationId: string,
    accountId: string,
  ): Promise<TradingTrade[]> {
    return this.client.request<TradingTrade[]>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(accountId)}/trades`,
    );
  }

  placeOrder(
    organizationId: string,
    accountId: string,
    request: PlaceOrderRequest,
  ): Promise<unknown> {
    return this.client.request<unknown>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(accountId)}/orders`,
      {
        method: "POST",
        body: JSON.stringify(request),
      },
    );
  }

  closePosition(
    organizationId: string,
    accountId: string,
    positionId: string,
  ): Promise<unknown> {
    return this.client.request<unknown>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(
        accountId,
      )}/positions/${encodeURIComponent(positionId)}/close`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }

  cancelOrder(
    organizationId: string,
    accountId: string,
    orderId: string,
  ): Promise<void> {
    return this.client.request<void>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(
        accountId,
      )}/orders/${encodeURIComponent(orderId)}/cancel`,
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    );
  }

  updatePendingOrder(
    organizationId: string,
    accountId: string,
    orderId: string,
    request: UpdatePendingOrderRequest,
  ): Promise<unknown> {
    return this.client.request<unknown>(
      `organizations/${encodeURIComponent(
        organizationId,
      )}/trading-accounts/${encodeURIComponent(
        accountId,
      )}/orders/${encodeURIComponent(orderId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(request),
      },
    );
  }
}
