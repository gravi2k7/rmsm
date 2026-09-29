import {
  BrokerAccount,
  BrokerAdapter,
  BrokerConnectionTestResult,
  BrokerOrder,
  BrokerOrderRequest,
  BrokerOrderResult,
  BrokerPosition,
  BrokerTrade,
} from "../../../application/brokers/contracts/broker-adapter";
import {
  MetaTrader5Client,
  type MetaTrader5ClientConfig,
  type MetaTrader5Credentials,
} from "./mt5.client";
import type {
  Mt5AccountResponse,
  Mt5DealHistoryResponse,
  Mt5OrderHistoryResponse,
  Mt5OrderResponse,
  Mt5OrderRequestPayload,
  Mt5PositionResponse,
} from "./mt5.types";

export class MetaTrader5Adapter implements BrokerAdapter {
  readonly provider = "MT5" as const;

  constructor(
    private readonly client: MetaTrader5Client,
    private readonly credentials: MetaTrader5Credentials,
  ) {}

  static fromCredentials(
    credentials: MetaTrader5Credentials,
    config: MetaTrader5ClientConfig,
  ): MetaTrader5Adapter {
    return new MetaTrader5Adapter(
      new MetaTrader5Client(config),
      credentials,
    );
  }

  async testConnection(): Promise<BrokerConnectionTestResult> {
    const session = await this.client.testConnection(this.credentials);

    return {
      success: true,
      message: `Connected to MetaTrader 5 account ${session.accountNumber}`,
      brokerAccountId: session.accountNumber,
    };
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const account =
      await this.client.request<Mt5AccountResponse>(
        "GET",
        "/account",
      );

    return [
      {
        id: String(account.login),
        name: account.name,
        balance: account.balance,
        canTrade: true,
        currency: account.currency,
      },
    ];
  }

  async getPositions(accountId: string): Promise<BrokerPosition[]> {
    const positions =
      await this.client.request<Mt5PositionResponse[]>(
        "GET",
        "/positions",
      );

    return positions.map((position) => ({
      id: String(position.ticket),
      accountId: String(accountId),
      instrumentId: position.symbol,
      side: position.side,
      quantity: position.volume,
      averagePrice: position.openPrice,
    }));
  }

  async getOrders(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerOrder[]> {
    const params = new URLSearchParams({
      from: startTimestamp,
      ...(endTimestamp ? { to: endTimestamp } : {}),
    });

    const orders =
      await this.client.request<Mt5OrderHistoryResponse[]>(
        "GET",
        `/history/orders?${params.toString()}`,
      );

    return orders.map((order) => ({
      id: String(order.orderId),
      accountId: String(accountId),
      instrumentId: order.symbol,
      side: this.inferSide(order.type),
      type: this.mapOrderType(order.type),
      quantity: order.volume,
      status: this.mapStatus(order.status),
      ...(order.price !== undefined
        ? { limitPrice: order.price }
        : {}),
      ...(order.comment
        ? { clientOrderId: order.comment }
        : {}),
      createdAt: new Date(order.timeSetup),
      updatedAt: new Date(order.timeSetup),
    }));
  }

  async getTrades(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerTrade[]> {
    const params = new URLSearchParams({
      from: startTimestamp,
      ...(endTimestamp ? { to: endTimestamp } : {}),
    });

    const [trades, orders] = await Promise.all([
      this.client.request<Mt5DealHistoryResponse[]>(
        "GET",
        `/history/deals?${params.toString()}`,
      ),
      this.client.request<Mt5OrderHistoryResponse[]>(
        "GET",
        `/history/orders?${params.toString()}`,
      ),
    ]);

    const sideByOrderId = new Map<string, "BUY" | "SELL">();

    for (const order of orders) {
      sideByOrderId.set(
        String(order.orderId),
        this.inferSide(order.type),
      );
    }

    return trades.map((trade) => {
      if (!trade.orderId) {
        throw new Error(
          `MT5 deal ${trade.dealId} has no orderId; cannot determine BUY/SELL side.`,
        );
      }

      const side = sideByOrderId.get(String(trade.orderId));

      if (!side) {
        throw new Error(
          `MT5 deal ${trade.dealId} references unknown order ${trade.orderId}; cannot determine BUY/SELL side.`,
        );
      }

      return {
        id: String(trade.dealId),
        accountId: String(accountId),
        instrumentId: trade.symbol,
        orderId: String(trade.orderId),
        side,
        quantity: trade.volume,
        price: trade.price,
        commission: trade.commission,
        profitAndLoss: trade.profit,
        timestamp: new Date(trade.time),
      };
    });
  }

  async placeOrder(
    request: BrokerOrderRequest,
  ): Promise<BrokerOrderResult> {
    const orderType = this.mapRequestType(request);

    const payload: Mt5OrderRequestPayload = {
      symbol: request.brokerSymbol ?? request.instrumentId,
      side: request.side,
      orderType,
      volume: request.quantity,
      ...(request.limitPrice !== undefined
        ? { price: request.limitPrice }
        : request.stopPrice !== undefined
          ? { price: request.stopPrice }
          : {}),
      ...(request.stopLossPrice !== undefined
        ? { stopLoss: request.stopLossPrice }
        : {}),
      ...(request.takeProfitPrice !== undefined
        ? { takeProfit: request.takeProfitPrice }
        : {}),
      ...(request.clientOrderId
        ? { comment: "RMSM" }
        : {}),
    };

    const response =
      await this.client.request<Mt5OrderResponse>(
        "POST",
        "/orders",
        payload,
      );

    const accepted = Boolean(response.accepted);

    if (!response.orderId) {
      throw new Error(
        response.message ??
          `MT5 worker returned no orderId (status=${response.status})`,
      );
    }

    if (
      accepted &&
      orderType === "MARKET" &&
      response.dealId &&
      response.volume > 0 &&
      response.price !== undefined
    ) {
      return {
        brokerOrderId: response.orderId,
        accepted: true,
        status: "FILLED",
        message: response.message,
        filledQuantity: response.volume,
        filledPrice: response.price,
        filledAt: new Date(),
        fills: [
          {
            id: response.dealId,
            accountId: request.accountId,
            instrumentId: request.instrumentId,
            orderId: response.orderId,
            side: request.side,
            quantity: response.volume,
            price: response.price,
            commission: 0,
            timestamp: new Date(),
          },
        ],
      };
    }

    return {
      brokerOrderId: response.orderId,
      accepted,
      status: accepted
        ? orderType === "MARKET"
          ? "FILLED"
          : "ACCEPTED"
        : "REJECTED",
      message: response.message,
      ...(accepted && response.volume > 0
        ? { filledQuantity: response.volume }
        : {}),
      ...(accepted && response.price !== undefined
        ? { filledPrice: response.price }
        : {}),
      ...(accepted
        ? { filledAt: new Date() }
        : {}),
    };
  }

  async cancelOrder(
    _accountId: string,
    _brokerOrderId: string,
  ): Promise<void> {
    throw new Error(
      "MT5 worker does not currently expose order-cancel endpoints.",
    );
  }

  async modifyOrder(
    _accountId: string,
    _brokerOrderId: string,
    _request: {
      quantity?: number;
      limitPrice?: number;
      stopPrice?: number;
    },
  ): Promise<void> {
    throw new Error(
      "MT5 worker does not currently expose order-modify endpoints.",
    );
  }

  private mapRequestType(
    request: BrokerOrderRequest,
  ): "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT" {
    switch (request.type) {
      case "MARKET":
        return "MARKET";
      case "LIMIT":
        return "LIMIT";
      case "STOP":
        return "STOP";
      case "STOP_LIMIT":
        return "STOP_LIMIT";
      default:
        throw new Error(
          `Unsupported MT5 order type: ${request.type}`,
        );
    }
  }

  private mapOrderType(
    type: string,
  ): BrokerOrder["type"] {
    const normalized = type.toUpperCase();

    if (normalized.includes("STOP_LIMIT")) {
      return "STOP_LIMIT";
    }

    if (normalized.includes("STOP")) {
      return "STOP";
    }

    if (normalized.includes("LIMIT")) {
      return "LIMIT";
    }

    return "MARKET";
  }

  private inferSide(type: string): "BUY" | "SELL" {
    return type.toUpperCase().includes("SELL")
      ? "SELL"
      : "BUY";
  }

  private mapStatus(status: string): string {
    const normalized = status.toUpperCase();

    if (
      normalized.includes("FILLED") ||
      normalized.includes("EXECUTED") ||
      normalized === "DONE"
    ) {
      return "FILLED";
    }

    if (
      normalized.includes("CANCEL") ||
      normalized.includes("EXPIRE")
    ) {
      return "CANCELLED";
    }

    if (normalized.includes("REJECT")) {
      return "REJECTED";
    }

    return "PENDING";
  }

  private isRejected(status: string): boolean {
    return this.mapStatus(status) === "REJECTED";
  }
}
