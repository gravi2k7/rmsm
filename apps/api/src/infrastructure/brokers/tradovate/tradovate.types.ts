export interface TradovateCredentials {
  username: string;
  password: string;
  baseUrl?: string;
}

export interface TradovateAccount {
  id: number;
  name: string;
  userId?: number;
  accountType?: string;
  active?: boolean;
}

export interface TradovateCashBalanceSnapshot {
  errorText?: string;
  totalCashValue?: number;
  netLiq?: number;
  openPnL?: number;
  realizedPnL?: number;
}

export interface TradovateOrder {
  id: number;
  accountId: number;
  timestamp?: string;
  action: "Buy" | "Sell";
  ordStatus: string;
  contractId?: number;
  orderQty?: number;
  orderType?: string;
  price?: number;
  stopPrice?: number;
  clOrdId?: string;
  customTag50?: string;
  filledQty?: number;
  filledPrice?: number;
}

export interface TradovateFill {
  id: number;
  orderId: number;
  contractId: number;
  timestamp: string;
  action: "Buy" | "Sell";
  qty: number;
  price: number;
}

export interface TradovatePosition {
  id: number;
  accountId: number;
  contractId: number;
  timestamp?: string;
  netPos: number;
  netPrice?: number;
}

export interface TradovatePlaceOrderRequest {
  accountSpec: string;
  accountId: number;
  action: "Buy" | "Sell";
  symbol: string;
  orderQty: number;
  orderType: "Market" | "Limit" | "Stop" | "StopLimit";
  price?: number;
  stopPrice?: number;
  clOrdId?: string;
  customTag50?: string;
  isAutomated: true;
}

export interface TradovateCommandResult {
  failureReason?: string;
  failureText?: string;
  orderId?: number;
  commandId?: number;
}

export interface TradovateAccessTokenResponse {
  errorText?: string;
  accessToken?: string;
  expirationTime?: string;
  userStatus?: string;
  userId?: number;
  name?: string;
}
