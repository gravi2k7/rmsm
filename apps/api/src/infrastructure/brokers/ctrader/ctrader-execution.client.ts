import { CTraderOpenApiClient } from "../../../modules/market-data/providers/ctrader/openapi/ctrader-openapi.client";

const NEW_ORDER_REQ = 2106;
const EXECUTION_EVENT = 2126;
const CANCEL_ORDER_REQ = 2108;
const AMEND_ORDER_REQ = 2109;
const RECONCILE_REQ = 2124;
const TRADER_REQ = 2121;
const ORDER_LIST_REQ = 2175;
const DEAL_LIST_REQ = 2133;

export type CTraderExecutionCredentials = {
  host: string;
  port: number;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  accountId: number;
  connectTimeoutMs?: number;
  requestTimeoutMs?: number;
};

export class CTraderExecutionClient {
  private readonly client: CTraderOpenApiClient;

  constructor(credentials: CTraderExecutionCredentials) {
    this.client = new CTraderOpenApiClient({
      host: credentials.host,
      port: credentials.port,
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      accessToken: credentials.accessToken,
      accountId: credentials.accountId,
      connectTimeoutMs: credentials.connectTimeoutMs ?? 10_000,
      requestTimeoutMs: credentials.requestTimeoutMs ?? 15_000,
    });
  }

  get accountId(): number {
    return this.client.accountId;
  }

  async testConnection(): Promise<void> {
    await this.client.connect();

    await this.client.sendRequest(
      TRADER_REQ,
      "ProtoOATraderReq",
      {
        ctidTraderAccountId: this.accountId,
      },
    );
  }

  async reconcile(): Promise<unknown> {
    await this.client.connect();

    const response = await this.client.sendRequest(
      RECONCILE_REQ,
      "ProtoOAReconcileReq",
      {
        ctidTraderAccountId: this.accountId,
        returnProtectionOrders: false,
      },
    );

    if (response.payloadType !== 2125) {
      throw new Error(
        `Unexpected cTrader reconcile response payload: ${response.payloadType}`,
      );
    }

    return response;
  }

  async getOrders(
    fromTimestamp?: number,
    toTimestamp?: number,
  ): Promise<unknown> {
    await this.client.connect();

    return this.client.sendRequest(
      ORDER_LIST_REQ,
      "ProtoOAOrderListReq",
      {
        ctidTraderAccountId: this.accountId,
        ...(fromTimestamp !== undefined ? { fromTimestamp } : {}),
        ...(toTimestamp !== undefined ? { toTimestamp } : {}),
      },
    );
  }

  async getDeals(
    fromTimestamp?: number,
    toTimestamp?: number,
  ): Promise<unknown> {
    await this.client.connect();

    return this.client.sendRequest(
      DEAL_LIST_REQ,
      "ProtoOADealListReq",
      {
        ctidTraderAccountId: this.accountId,
        ...(fromTimestamp !== undefined ? { fromTimestamp } : {}),
        ...(toTimestamp !== undefined ? { toTimestamp } : {}),
      },
    );
  }

  async placeOrder(request: {
    symbolId: number;
    side: "BUY" | "SELL";
    type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
    quantity: number;
    limitPrice?: number;
    stopPrice?: number;
    stopLossPrice?: number;
    takeProfitPrice?: number;
    clientOrderId?: string;
  }): Promise<unknown> {
    await this.client.connect();

    const orderType = {
      MARKET: 1,
      LIMIT: 2,
      STOP: 3,
      STOP_LIMIT: 5,
    } as const;

    const tradeSide = {
      BUY: 1,
      SELL: 2,
    } as const;

    const volume = Math.round(request.quantity * 100);

    if (!Number.isSafeInteger(volume) || volume <= 0) {
      throw new Error(
        `Invalid cTrader order volume derived from quantity ${request.quantity}`,
      );
    }

    const response = await this.client.sendRequest(
      NEW_ORDER_REQ,
      "ProtoOANewOrderReq",
      {
        ctidTraderAccountId: this.accountId,
        symbolId: request.symbolId,
        orderType: orderType[request.type],
        tradeSide: tradeSide[request.side],
        volume,
        ...(request.limitPrice !== undefined
          ? { limitPrice: request.limitPrice }
          : {}),
        ...(request.stopPrice !== undefined
          ? { stopPrice: request.stopPrice }
          : {}),
        ...(request.stopLossPrice !== undefined
          ? { stopLoss: request.stopLossPrice }
          : {}),
        ...(request.takeProfitPrice !== undefined
          ? { takeProfit: request.takeProfitPrice }
          : {}),
        ...(request.clientOrderId
          ? { clientOrderId: request.clientOrderId }
          : {}),
      },
    );

    if (response.payloadType !== EXECUTION_EVENT) {
      throw new Error(
        `Unexpected cTrader execution response payload: ${response.payloadType}`,
      );
    }

    return response;
  }

  async cancelOrder(orderId: number): Promise<void> {
    await this.client.connect();

    const response = await this.client.sendRequest(
      CANCEL_ORDER_REQ,
      "ProtoOACancelOrderReq",
      {
        ctidTraderAccountId: this.accountId,
        orderId,
      },
    );

    if (response.payloadType !== EXECUTION_EVENT) {
      throw new Error(
        `Unexpected cTrader cancel response payload: ${response.payloadType}`,
      );
    }
  }

  async amendOrder(
    orderId: number,
    request: {
      quantity?: number;
      limitPrice?: number;
      stopPrice?: number;
    },
  ): Promise<void> {
    await this.client.connect();

    const volume =
      request.quantity !== undefined
        ? Math.round(request.quantity * 100)
        : undefined;

    const response = await this.client.sendRequest(
      AMEND_ORDER_REQ,
      "ProtoOAAmendOrderReq",
      {
        ctidTraderAccountId: this.accountId,
        orderId,
        ...(volume !== undefined ? { volume } : {}),
        ...(request.limitPrice !== undefined
          ? { limitPrice: request.limitPrice }
          : {}),
        ...(request.stopPrice !== undefined
          ? { stopPrice: request.stopPrice }
          : {}),
      },
    );

    if (response.payloadType !== EXECUTION_EVENT) {
      throw new Error(
        `Unexpected cTrader amend response payload: ${response.payloadType}`,
      );
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}
