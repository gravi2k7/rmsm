import type {
  BrokerAccount,
  BrokerAdapter,
  BrokerConnectionTestResult,
  BrokerOrder,
  BrokerOrderRequest,
  BrokerOrderResult,
  BrokerPosition,
  BrokerTrade,
} from "../../../application/brokers/contracts/broker-adapter";
import { TradovateClient } from "./tradovate.client";
import type { TradovateCredentials } from "./tradovate.types";

const ORDER_TYPES = {
  MARKET: "Market",
  LIMIT: "Limit",
  STOP: "Stop",
  STOP_LIMIT: "StopLimit",
} as const;

export class TradovateAdapter implements BrokerAdapter {
  readonly provider = "TRADOVATE" as const;

  constructor(
    private readonly client: TradovateClient,
    private readonly credentials: TradovateCredentials,
  ) {}

  async testConnection(): Promise<BrokerConnectionTestResult> {
    const accounts = await this.client.testConnection();

    const account = accounts.find(
      (item) => item.active === true || item.active === undefined,
    );

    return {
      success: accounts.length > 0,
      message:
        account
          ? `Connected to Tradovate account ${account.id}`
          : "Tradovate connected but no active account was returned.",
      brokerAccountId: account
        ? String(account.id)
        : undefined,
    };
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const accounts = await this.client.getAccounts();

    const result: BrokerAccount[] = [];

    for (const account of accounts) {
      if (account.active !== true && account.active !== undefined) {
        continue;
      }

      let balance: number | undefined;

      try {
        const snapshot =
          await this.client.getCashBalance(account.id);

        balance =
          snapshot.netLiq ??
          snapshot.totalCashValue;
      } catch {
        // Account discovery must remain usable even if
        // the optional balance snapshot is unavailable.
      }

      result.push({
        id: String(account.id),
        name: account.name,
        ...(balance !== undefined
          ? { balance }
          : {}),
        canTrade: account.active === true || account.active === undefined,
        currency: "USD",
      });
    }

    return result;
  }

  async getPositions(
    accountId: string,
  ): Promise<BrokerPosition[]> {
    const numericAccountId =
      this.requireNumericId(accountId, "accountId");

    const positions =
      await this.client.getPositions();

    return positions
      .filter(
        (position) =>
          position.accountId === numericAccountId &&
          position.netPos !== 0,
      )
      .map((position) => ({
        id: String(position.id),
        accountId: String(position.accountId),
        instrumentId: String(position.contractId),
        side:
          position.netPos > 0
            ? "BUY"
            : "SELL",
        quantity: Math.abs(position.netPos),
        averagePrice:
          position.netPrice ?? 0,
      }));
  }

  async getOrders(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerOrder[]> {
    const numericAccountId =
      this.requireNumericId(accountId, "accountId");

    const start = Date.parse(startTimestamp);
    const end = endTimestamp
      ? Date.parse(endTimestamp)
      : Number.POSITIVE_INFINITY;

    const orders = await this.client.getOrders();

    return orders
      .filter(
        (order) =>
          order.accountId === numericAccountId &&
          this.inRange(order.timestamp, start, end),
      )
      .map((order) => ({
        id: String(order.id),
        accountId: String(order.accountId),
        instrumentId: String(order.contractId ?? ""),
        side:
          order.action === "Buy"
            ? "BUY"
            : "SELL",
        type:
          this.mapOrderType(order.orderType),
        quantity:
          order.orderQty ??
          order.filledQty ??
          0,
        status:
          this.mapOrderStatus(order.ordStatus),
        ...(order.price !== undefined
          ? { limitPrice: order.price }
          : {}),
        ...(order.stopPrice !== undefined
          ? { stopPrice: order.stopPrice }
          : {}),
        ...(order.filledQty !== undefined
          ? { filledQuantity: order.filledQty }
          : {}),
        ...(order.filledPrice !== undefined
          ? { filledPrice: order.filledPrice }
          : {}),
        ...(order.clOrdId
          ? { clientOrderId: order.clOrdId }
          : {}),
        ...(order.timestamp
          ? { createdAt: new Date(order.timestamp) }
          : {}),
        ...(order.timestamp
          ? { updatedAt: new Date(order.timestamp) }
          : {}),
      }));
  }

  async getTrades(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerTrade[]> {
    const numericAccountId =
      this.requireNumericId(accountId, "accountId");

    const start = Date.parse(startTimestamp);
    const end = endTimestamp
      ? Date.parse(endTimestamp)
      : Number.POSITIVE_INFINITY;

    const [fills, orders] =
      await Promise.all([
        this.client.getFills(),
        this.client.getOrders(),
      ]);

    const accountOrderIds = new Set(
      orders
        .filter(
          (order) =>
            order.accountId === numericAccountId,
        )
        .map((order) => order.id),
    );

    return fills
      .filter(
        (fill) =>
          accountOrderIds.has(fill.orderId) &&
          this.inRange(fill.timestamp, start, end),
      )
      .map((fill) => ({
        id: String(fill.id),
        accountId,
        instrumentId: String(fill.contractId),
        orderId: String(fill.orderId),
        side:
          fill.action === "Buy"
            ? "BUY"
            : "SELL",
        quantity: fill.qty,
        price: fill.price,
        timestamp: new Date(fill.timestamp),
      }));
  }

  async placeOrder(
    request: BrokerOrderRequest,
  ): Promise<BrokerOrderResult> {
    const accountId =
      this.requireNumericId(
        request.accountId,
        "accountId",
      );

    const symbol = request.brokerSymbol?.trim();

    if (!symbol) {
      throw new Error(
        "Tradovate broker symbol is required for order placement.",
      );
    }

    if (
      request.stopLossPrice !== undefined ||
      request.takeProfitPrice !== undefined
    ) {
      throw new Error(
        "Tradovate protective stop/target orders are not part of the initial adapter path.",
      );
    }

    const result =
      await this.client.placeOrder({
        accountSpec:
          this.clientAccountSpec(request.accountId),
        accountId,
        action:
          request.side === "BUY"
            ? "Buy"
            : "Sell",
        symbol,
        orderQty: Math.trunc(request.quantity),
        orderType: ORDER_TYPES[request.type],
        ...(request.type === "LIMIT" &&
        request.limitPrice !== undefined
          ? { price: request.limitPrice }
          : {}),
        ...(request.type === "STOP" &&
        request.stopPrice !== undefined
          ? { stopPrice: request.stopPrice }
          : {}),
        ...(request.type === "STOP_LIMIT"
          ? {
              ...(request.limitPrice !== undefined
                ? { price: request.limitPrice }
                : {}),
              ...(request.stopPrice !== undefined
                ? { stopPrice: request.stopPrice }
                : {}),
            }
          : {}),
        ...(request.clientOrderId
          ? { clOrdId: request.clientOrderId }
          : {}),
        customTag50:
          request.clientOrderId?.slice(0, 64),
        isAutomated: true,
      });

    const accepted =
      result.failureReason === undefined ||
      result.failureReason === "Success";

    return {
      brokerOrderId:
        result.orderId !== undefined
          ? String(result.orderId)
          : "",
      accepted,
      status: accepted
        ? "ACCEPTED"
        : "REJECTED",
      ...(result.failureText
        ? { message: result.failureText }
        : {}),
    };
  }

  async cancelOrder(
    accountId: string,
    brokerOrderId: string,
  ): Promise<void> {
    this.requireNumericId(accountId, "accountId");

    const result =
      await this.client.cancelOrder(
        this.requireNumericId(
          brokerOrderId,
          "brokerOrderId",
        ),
      );

    if (
      result.failureReason &&
      result.failureReason !== "Success"
    ) {
      throw new Error(
        result.failureText ??
          `Tradovate cancellation failed: ${result.failureReason}`,
      );
    }
  }

  async modifyOrder(
    accountId: string,
    brokerOrderId: string,
    request: {
      quantity?: number;
      limitPrice?: number;
      stopPrice?: number;
    },
  ): Promise<void> {
    this.requireNumericId(accountId, "accountId");

    if (
      request.quantity === undefined &&
      request.limitPrice === undefined &&
      request.stopPrice === undefined
    ) {
      return;
    }

    const type =
      request.stopPrice !== undefined
        ? request.limitPrice !== undefined
          ? "StopLimit"
          : "Stop"
        : request.limitPrice !== undefined
          ? "Limit"
          : "Market";

    const result =
      await this.client.modifyOrder({
        orderId:
          this.requireNumericId(
            brokerOrderId,
            "brokerOrderId",
          ),
        orderQty:
          Math.trunc(request.quantity ?? 1),
        orderType: type,
        ...(request.limitPrice !== undefined
          ? { price: request.limitPrice }
          : {}),
        ...(request.stopPrice !== undefined
          ? { stopPrice: request.stopPrice }
          : {}),
      });

    if (
      result.failureReason &&
      result.failureReason !== "Success"
    ) {
      throw new Error(
        result.failureText ??
          `Tradovate modification failed: ${result.failureReason}`,
      );
    }
  }

  private mapOrderType(
    type?: string,
  ): BrokerOrder["type"] {
    switch (type) {
      case "Limit":
        return "LIMIT";
      case "Stop":
        return "STOP";
      case "StopLimit":
        return "STOP_LIMIT";
      case "Market":
      default:
        return "MARKET";
    }
  }

  private mapOrderStatus(
    status: string,
  ): string {
    const normalized =
      status.toUpperCase();

    if (
      normalized === "FILLED" ||
      normalized === "COMPLETED"
    ) {
      return "FILLED";
    }

    if (
      normalized === "CANCELED" ||
      normalized === "EXPIRED"
    ) {
      return "CANCELLED";
    }

    if (normalized === "REJECTED") {
      return "REJECTED";
    }

    return "PENDING";
  }

  private inRange(
    timestamp: string | undefined,
    start: number,
    end: number,
  ): boolean {
    if (!timestamp) {
      return true;
    }

    const value = Date.parse(timestamp);

    return (
      Number.isFinite(value) &&
      value >= start &&
      value <= end
    );
  }

  private requireNumericId(
    value: string,
    field: string,
  ): number {
    const numeric = Number(value);

    if (
      !Number.isInteger(numeric) ||
      numeric <= 0
    ) {
      throw new Error(
        `Invalid Tradovate ${field}: ${value}`,
      );
    }

    return numeric;
  }

  /*
   * Tradovate's place-order API expects accountSpec
   * to identify the account/user. The accountId remains
   * the authoritative numeric account binding.
   */
  private clientAccountSpec(
    _accountId: string,
  ): string {
    return this.credentials.username;
  }
}
