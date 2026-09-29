export type BrokerProviderName =
  | "PROJECTX"
  | "CTRADER"
  | "MT5"
  | "TRADOVATE";

export interface BrokerConnectionTestResult {
  success: boolean;
  message: string;
  brokerAccountId?: string;
}

export interface BrokerAccount {
  id: string;
  name: string;
  balance?: number;
  canTrade: boolean;
  currency?: string;
}

export interface BrokerPosition {
  id: string;
  accountId: string;
  instrumentId: string;
  side: "BUY" | "SELL";
  quantity: number;
  averagePrice: number;
}

export interface BrokerOrderRequest {
  accountId: string;
  instrumentId: string;
  brokerSymbol?: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: number;
  limitPrice?: number;
  stopPrice?: number;
  stopLossPrice?: number;
  takeProfitPrice?: number;
  clientOrderId?: string;
}

export interface BrokerOrder {
  id: string;
  accountId: string;
  instrumentId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: number;
  status: string;
  limitPrice?: number;
  stopPrice?: number;
  filledQuantity?: number;
  filledPrice?: number;
  clientOrderId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BrokerTrade {
  id: string;
  accountId: string;
  instrumentId: string;
  orderId?: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  commission?: number;
  profitAndLoss?: number;
  timestamp: Date;
}

export interface BrokerOrderResult {
  brokerOrderId: string;
  accepted: boolean;
  status?: string;
  message?: string;
  filledQuantity?: number;
  filledPrice?: number;
  filledAt?: Date;
  fills?: BrokerTrade[];
}

export interface BrokerAdapter {
  readonly provider: BrokerProviderName;

  testConnection(): Promise<BrokerConnectionTestResult>;

  getAccounts(): Promise<BrokerAccount[]>;

  getPositions(accountId: string): Promise<BrokerPosition[]>;

  getOrders(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerOrder[]>;

  getTrades(
    accountId: string,
    startTimestamp: string,
    endTimestamp?: string,
  ): Promise<BrokerTrade[]>;

  placeOrder(request: BrokerOrderRequest): Promise<BrokerOrderResult>;

  cancelOrder(
    accountId: string,
    brokerOrderId: string,
  ): Promise<void>;

  modifyOrder(
    accountId: string,
    brokerOrderId: string,
    request: {
      quantity?: number;
      limitPrice?: number;
      stopPrice?: number;
    },
  ): Promise<void>;
}
