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
  CTraderExecutionClient,
  type CTraderExecutionCredentials,
} from "./ctrader-execution.client";

const ORDER_TYPE = {
  MARKET: 1,
  LIMIT: 2,
  STOP: 3,
  STOP_LIMIT: 5,
} as const;

const SIDE = {
  BUY: 1,
  SELL: 2,
} as const;

const EXECUTION_TYPE = {
  ORDER_ACCEPTED: 2,
  ORDER_FILLED: 3,
  ORDER_REPLACED: 4,
  ORDER_CANCELLED: 5,
  ORDER_EXPIRED: 6,
  ORDER_REJECTED: 7,
  ORDER_CANCEL_REJECTED: 8,
} as const;

type CTraderRecord = Record<string, any>;

export class CTraderAdapter implements BrokerAdapter {
  readonly provider = "CTRADER" as const;

  private readonly client: CTraderExecutionClient;

  constructor(
    credentials: CTraderExecutionCredentials,
    private readonly defaultAccountId?: string,
  ) {
    this.client = new CTraderExecutionClient(credentials);
  }

  async testConnection(): Promise<BrokerConnectionTestResult> {
    await this.client.testConnection();

    return {
      success: true,
      message: `Connected to cTrader account ${this.client.accountId}`,
      brokerAccountId: String(this.client.accountId),
    };
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const response = (await this.client.reconcile()) as CTraderRecord;

    const trader = response.trader ?? response;

    return [
      {
        id: String(this.client.accountId),
        name:
          trader.name ??
          trader.nickname ??
          `cTrader ${this.client.accountId}`,
        balance: this.readMoney(trader.balance, trader.moneyDigits),
        canTrade: true,
        currency:
          trader.depositAssetName ??
          trader.depositAssetId ??
          undefined,
      },
    ];
  }

  async getPositions(accountId: string): Promise<BrokerPosition[]> {
    this.requireAccountId(accountId);

    const response = (await this.client.reconcile()) as CTraderRecord;
    const positions = Array.isArray(response.position)
      ? response.position
      : Array.isArray(response.positions)
        ? response.positions
        : [];

    return positions.map((position: CTraderRecord) => {
      const tradeData = position.tradeData ?? {};

      return {
        id: String(position.positionId),
        accountId: String(this.client.accountId),
        instrumentId: String(tradeData.symbolId),
        side: this.mapSide(tradeData.tradeSide),
        quantity: this.fromCents(tradeData.volume),
        averagePrice: Number(position.price ?? 0),
      };
    });
  }

  async getOrders(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerOrder[]> {
    this.requireAccountId(accountId);

    const response = (await this.client.getOrders(
      this.toTimestamp(startTimestamp),
      endTimestamp ? this.toTimestamp(endTimestamp) : undefined,
    )) as CTraderRecord;

    const orders = Array.isArray(response.order)
      ? response.order
      : Array.isArray(response.orders)
        ? response.orders
        : [];

    return orders.map((order: CTraderRecord) =>
      this.mapOrder(order),
    );
  }

  async getTrades(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerTrade[]> {
    this.requireAccountId(accountId);

    const response = (await this.client.getDeals(
      this.toTimestamp(startTimestamp),
      endTimestamp ? this.toTimestamp(endTimestamp) : undefined,
    )) as CTraderRecord;

    const deals = Array.isArray(response.deal)
      ? response.deal
      : Array.isArray(response.deals)
        ? response.deals
        : [];

    return deals.map((deal: CTraderRecord) => ({
      id: String(deal.dealId),
      accountId: String(this.client.accountId),
      instrumentId: String(deal.symbolId),
      orderId:
        deal.orderId !== undefined
          ? String(deal.orderId)
          : undefined,
      side: this.mapSide(deal.tradeSide),
      quantity: this.fromCents(
        deal.filledVolume ?? deal.volume,
      ),
      price: Number(deal.executionPrice ?? 0),
      commission: this.readMoney(
        deal.commission,
        deal.moneyDigits,
      ),
      timestamp: new Date(
        Number(
          deal.executionTimestamp ??
            deal.utcLastUpdateTimestamp ??
            deal.createTimestamp,
        ),
      ),
    }));
  }

  async placeOrder(
    request: BrokerOrderRequest,
  ): Promise<BrokerOrderResult> {
    const response =
      (await this.client.placeOrder({
        symbolId: this.requireNumericId(
          request.instrumentId,
          "brokerInstrumentId",
        ),
        side: request.side,
        type: request.type,
        quantity: request.quantity,
        ...(request.limitPrice !== undefined
          ? { limitPrice: request.limitPrice }
          : {}),
        ...(request.stopPrice !== undefined
          ? { stopPrice: request.stopPrice }
          : {}),
        ...(request.stopLossPrice !== undefined
          ? { stopLossPrice: request.stopLossPrice }
          : {}),
        ...(request.takeProfitPrice !== undefined
          ? { takeProfitPrice: request.takeProfitPrice }
          : {}),
        ...(request.clientOrderId
          ? { clientOrderId: request.clientOrderId }
          : {}),
      })) as CTraderRecord;

    const order = response.order ?? {};
    const deal = response.deal ?? {};
    const executionType = Number(
      response.executionType ?? 0,
    );

    const accepted =
      executionType === EXECUTION_TYPE.ORDER_ACCEPTED ||
      executionType === EXECUTION_TYPE.ORDER_FILLED ||
      executionType === EXECUTION_TYPE.ORDER_REPLACED;

    const rejected =
      executionType === EXECUTION_TYPE.ORDER_REJECTED ||
      executionType === EXECUTION_TYPE.ORDER_CANCEL_REJECTED;

    const fills =
      deal.dealId !== undefined
        ? [this.mapDeal(deal)]
        : [];

    const firstFill = fills[0];

    return {
      brokerOrderId:
        order.orderId !== undefined
          ? String(order.orderId)
          : deal.orderId !== undefined
            ? String(deal.orderId)
            : "",
      accepted: accepted && !rejected,
      status: this.mapExecutionStatus(executionType),
      ...(firstFill
        ? {
            filledQuantity: fills.reduce(
              (sum, fill) => sum + fill.quantity,
              0,
            ),
            filledPrice: firstFill.price,
            filledAt: firstFill.timestamp,
            fills,
          }
        : {}),
    };
  }

  async cancelOrder(
    accountId: string,
    brokerOrderId: string,
  ): Promise<void> {
    this.requireAccountId(accountId);

    await this.client.cancelOrder(
      this.requireNumericId(
        brokerOrderId,
        "brokerOrderId",
      ),
    );
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
    this.requireAccountId(accountId);

    await this.client.amendOrder(
      this.requireNumericId(
        brokerOrderId,
        "brokerOrderId",
      ),
      request,
    );
  }

  private mapOrder(order: CTraderRecord): BrokerOrder {
    const tradeData = order.tradeData ?? {};

    return {
      id: String(order.orderId),
      accountId: String(this.client.accountId),
      instrumentId: String(tradeData.symbolId),
      side: this.mapSide(tradeData.tradeSide),
      type: this.mapOrderType(order.orderType),
      status: this.mapOrderStatus(order.orderStatus),
      quantity: this.fromCents(tradeData.volume),
      ...(order.limitPrice !== undefined
        ? { limitPrice: Number(order.limitPrice) }
        : {}),
      ...(order.stopPrice !== undefined
        ? { stopPrice: Number(order.stopPrice) }
        : {}),
      ...(order.executedVolume !== undefined
        ? {
            filledQuantity: this.fromCents(
              order.executedVolume,
            ),
          }
        : {}),
      ...(order.executionPrice !== undefined
        ? { filledPrice: Number(order.executionPrice) }
        : {}),
      ...(order.clientOrderId
        ? { clientOrderId: String(order.clientOrderId) }
        : {}),
      ...(tradeData.openTimestamp !== undefined
        ? {
            createdAt: new Date(
              Number(tradeData.openTimestamp),
            ),
          }
        : {}),
      ...(order.utcLastUpdateTimestamp !== undefined
        ? {
            updatedAt: new Date(
              Number(order.utcLastUpdateTimestamp),
            ),
          }
        : {}),
    };
  }

  private mapDeal(deal: CTraderRecord): BrokerTrade {
    return {
      id: String(deal.dealId),
      accountId: String(this.client.accountId),
      instrumentId: String(deal.symbolId),
      orderId:
        deal.orderId !== undefined
          ? String(deal.orderId)
          : undefined,
      side: this.mapSide(deal.tradeSide),
      quantity: this.fromCents(
        deal.filledVolume ?? deal.volume,
      ),
      price: Number(deal.executionPrice ?? 0),
      commission: this.readMoney(
        deal.commission,
        deal.moneyDigits,
      ),
      timestamp: new Date(
        Number(
          deal.executionTimestamp ??
            deal.utcLastUpdateTimestamp ??
            deal.createTimestamp,
        ),
      ),
    };
  }

  private mapSide(value: unknown): "BUY" | "SELL" {
    return Number(value) === SIDE.SELL ? "SELL" : "BUY";
  }

  private mapOrderType(value: unknown): BrokerOrder["type"] {
    switch (Number(value)) {
      case ORDER_TYPE.LIMIT:
        return "LIMIT";
      case ORDER_TYPE.STOP:
        return "STOP";
      case ORDER_TYPE.STOP_LIMIT:
        return "STOP_LIMIT";
      case ORDER_TYPE.MARKET:
      default:
        return "MARKET";
    }
  }

  private mapOrderStatus(value: unknown): string {
    switch (Number(value)) {
      case 2:
        return "ACCEPTED";
      case 3:
        return "FILLED";
      case 4:
        return "CANCELLED";
      case 5:
        return "REJECTED";
      default:
        return String(value ?? "PENDING");
    }
  }

  private mapExecutionStatus(value: number): string {
    switch (value) {
      case EXECUTION_TYPE.ORDER_FILLED:
        return "FILLED";
      case EXECUTION_TYPE.ORDER_CANCELLED:
      case EXECUTION_TYPE.ORDER_EXPIRED:
        return "CANCELLED";
      case EXECUTION_TYPE.ORDER_REJECTED:
      case EXECUTION_TYPE.ORDER_CANCEL_REJECTED:
        return "REJECTED";
      case EXECUTION_TYPE.ORDER_ACCEPTED:
      case EXECUTION_TYPE.ORDER_REPLACED:
      default:
        return "ACCEPTED";
    }
  }

  private fromCents(value: unknown): number {
    const numeric = Number(value ?? 0);
    return numeric / 100;
  }

  private readMoney(
    value: unknown,
    moneyDigits: unknown,
  ): number | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    const numeric = Number(value);
    const digits = Number(moneyDigits ?? 0);

    return digits > 0
      ? numeric / 10 ** digits
      : numeric;
  }

  private requireAccountId(accountId: string): void {
    if (String(accountId) !== String(this.client.accountId)) {
      throw new Error(
        `cTrader account mismatch: expected ${this.client.accountId}, received ${accountId}`,
      );
    }
  }

  private requireNumericId(
    value: string,
    field: string,
  ): number {
    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new Error(
        `Invalid cTrader ${field}: ${value}`,
      );
    }

    return numeric;
  }

  private toTimestamp(value: string): number {
    const timestamp = Date.parse(value);

    if (!Number.isFinite(timestamp)) {
      throw new Error(
        `Invalid timestamp: ${value}`,
      );
    }

    return timestamp;
  }
}
