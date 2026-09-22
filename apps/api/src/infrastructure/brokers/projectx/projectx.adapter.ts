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
import { ProjectXClient } from "./projectx.client";

const PROJECTX_ORDER_TYPE = {
  LIMIT: 1,
  MARKET: 2,
  STOP_LIMIT: 3,
  STOP: 4,
} as const;

const PROJECTX_SIDE = {
  BUY: 0,
  SELL: 1,
} as const;

export class ProjectXAdapter implements BrokerAdapter {
  readonly provider = "PROJECTX" as const;

  constructor(
    private readonly client: ProjectXClient,
    private readonly defaultAccountId?: string,
  ) {}

  async testConnection(): Promise<BrokerConnectionTestResult> {
    const response = await this.client.testConnection();

    const account = response.accounts.find(
      (item) =>
        !this.defaultAccountId ||
        String(item.id) === this.defaultAccountId,
    );

    return {
      success: response.success,
      message:
        response.errorMessage ??
        (account
          ? `Connected to ProjectX account ${account.id}`
          : "ProjectX connected"),
      brokerAccountId: account ? String(account.id) : undefined,
    };
  }

  async getAccounts(): Promise<BrokerAccount[]> {
    const response = await this.client.getAccounts(true);

    return response.accounts.map((account) => ({
      id: String(account.id),
      name: account.name,
      balance: account.balance,
      canTrade: account.canTrade,
    }));
  }

  async getPositions(accountId: string): Promise<BrokerPosition[]> {
    const response = await this.client.getOpenPositions(
      this.requireAccountId(accountId),
    );

    return response.positions.map((position) => ({
      id: String(position.id),
      accountId: String(position.accountId),
      instrumentId: position.contractId,
      side: position.type === 1 ? "BUY" : "SELL",
      quantity: position.size,
      averagePrice: position.averagePrice,
    }));
  }

  async getOrders(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerOrder[]> {
    const response = await this.client.getOrders(
      this.requireAccountId(accountId),
      startTimestamp,
      endTimestamp,
    );

    return response.orders.map((order) => ({
      id: String(order.id),
      accountId: String(order.accountId),
      instrumentId: order.contractId,
      side: order.side === 0 ? "BUY" : "SELL",
      type: this.mapOrderType(order.type),
      quantity: order.size,
      status: this.mapBrokerOrderStatus(order.status),
      ...(order.limitPrice !== null
        ? { limitPrice: order.limitPrice }
        : {}),
      ...(order.stopPrice !== null
        ? { stopPrice: order.stopPrice }
        : {}),
      ...(order.fillVolume !== undefined
        ? { filledQuantity: order.fillVolume }
        : {}),
      ...(order.filledPrice !== null &&
      order.filledPrice !== undefined
        ? { filledPrice: order.filledPrice }
        : {}),
      ...(order.customTag ? { clientOrderId: order.customTag } : {}),
      createdAt: new Date(order.creationTimestamp),
      updatedAt: new Date(order.updateTimestamp),
    }));
  }

  async getTrades(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerTrade[]> {
    const response = await this.client.getTrades(
      this.requireAccountId(accountId),
      startTimestamp,
      endTimestamp,
    );

    return response.trades.map((trade) => ({
      id: String(trade.id),
      accountId: String(trade.accountId),
      instrumentId: trade.contractId,
      ...(trade.orderId !== undefined
        ? { orderId: String(trade.orderId) }
        : {}),
      side: trade.side === 0 ? "BUY" : "SELL",
      quantity: trade.size,
      price: trade.price,
      commission: trade.fees,
      ...(trade.profitAndLoss !== null
        ? { profitAndLoss: trade.profitAndLoss }
        : {}),
      timestamp: new Date(trade.creationTimestamp),
    }));
  }

  async placeOrder(
    request: BrokerOrderRequest,
  ): Promise<BrokerOrderResult> {
    const response = await this.client.placeOrder({
      accountId: this.requireAccountId(request.accountId),
      contractId: request.instrumentId,
      type: PROJECTX_ORDER_TYPE[request.type],
      side: PROJECTX_SIDE[request.side],
      size: request.quantity,
      limitPrice: request.limitPrice ?? null,
      stopPrice: request.stopPrice ?? null,
      customTag: request.clientOrderId ?? null,
    });

    return {
      brokerOrderId: String(response.orderId),
      accepted: response.success,
      status: response.success ? "ACCEPTED" : "REJECTED",
      message: response.errorMessage ?? undefined,
    };
  }

  async cancelOrder(
    accountId: string,
    brokerOrderId: string,
  ): Promise<void> {
    const response = await this.client.cancelOrder(
      this.requireAccountId(accountId),
      this.requireNumericId(brokerOrderId, "brokerOrderId"),
    );

    if (!response.success) {
      throw new Error(
        response.errorMessage ?? "ProjectX order cancellation failed",
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
    const response = await this.client.modifyOrder({
      accountId: this.requireAccountId(accountId),
      orderId: this.requireNumericId(brokerOrderId, "brokerOrderId"),
      size: request.quantity ?? null,
      limitPrice: request.limitPrice ?? null,
      stopPrice: request.stopPrice ?? null,
      trailPrice: null,
    });

    if (!response.success) {
      throw new Error(
        response.errorMessage ?? "ProjectX order modification failed",
      );
    }
  }

  private mapBrokerOrderStatus(status: number): string {
    switch (status) {
      case 2:
        return "FILLED";
      case 3:
        return "CANCELLED";
      case 4:
        return "CANCELLED";
      case 5:
        return "REJECTED";
      case 0:
      case 1:
      case 6:
      default:
        return "PENDING";
    }
  }

  private mapOrderType(type: number): BrokerOrder["type"] {
    switch (type) {
      case PROJECTX_ORDER_TYPE.LIMIT:
        return "LIMIT";
      case PROJECTX_ORDER_TYPE.STOP_LIMIT:
        return "STOP_LIMIT";
      case PROJECTX_ORDER_TYPE.STOP:
        return "STOP";
      case PROJECTX_ORDER_TYPE.MARKET:
      default:
        return "MARKET";
    }
  }

  private requireAccountId(accountId: string): number {
    const value = Number(accountId);

    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid ProjectX account ID: ${accountId}`);
    }

    return value;
  }

  private requireNumericId(value: string, field: string): number {
    const numeric = Number(value);

    if (!Number.isInteger(numeric) || numeric <= 0) {
      throw new Error(`Invalid ProjectX ${field}: ${value}`);
    }

    return numeric;
  }
}
