export type TradingAccountType = "DEMO" | "LIVE";
export type TradingAccountStatus = "ACTIVE" | "RESET" | "CLOSED";

export type TradingOrderSide = "BUY" | "SELL";

export type TradingOrderType =
  | "MARKET"
  | "LIMIT"
  | "STOP"
  | "STOP_LIMIT";

export type TradingOrderStatus =
  | "PENDING"
  | "FILLED"
  | "REJECTED"
  | "CANCELLED";

export type TradingPositionSide = "LONG" | "SHORT";
export type TradingPositionStatus = "OPEN" | "CLOSED";

export type TradingLedgerEntryType =
  | "INITIAL_DEPOSIT"
  | "VIRTUAL_DEPOSIT"
  | "RESET"
  | "WITHDRAWAL"
  | "TRADE_DEBIT"
  | "TRADE_CREDIT"
  | "FEE"
  | "ADJUSTMENT";

export interface TradingAccount {
  id: string;
  organizationId: string;
  ownerUserId: string;
  type: TradingAccountType;
  name: string;
  currency: string;
  startingBalance: string | null;
  balance: string;
  leverage: string;
  status: TradingAccountStatus;
  brokerConnectionId: string | null;
  brokerAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TradingOrder {
  id: string;
  accountId: string;
  instrumentId: string;
  side: TradingOrderSide;
  type: TradingOrderType;
  quantity: string;
  limitPrice: string | null;
  stopPrice: string | null;
  status: TradingOrderStatus;
  requestedPrice: string | null;
  executedPrice: string | null;
  rejectionReason: string | null;
  createdAt: string;
  filledAt: string | null;
}

export interface TradingPosition {
  id: string;
  accountId: string;
  instrumentId: string;
  side: TradingPositionSide;
  quantity: string;
  averageEntryPrice: string;
  stopLossPrice: string | null;
  takeProfitPrice: string | null;
  status: TradingPositionStatus;
  openedAt: string;
  closedAt: string | null;
  averageExitPrice: string | null;
  realizedPnl: string | null;
}

export interface TradingTrade {
  id: string;
  accountId: string;
  instrumentId: string;
  side: TradingPositionSide;
  quantity: string;
  entryPrice: string;
  exitPrice: string;
  realizedPnl: string;
  openedAt: string;
  closedAt: string;
}

export interface TradingLedgerEntry {
  id: string;
  accountId: string;
  type: TradingLedgerEntryType;
  amount: string;
  balanceAfter: string;
  reference: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PlacePaperOrderInput {
  instrumentId: string;
  side: TradingOrderSide;
  quantity: string;
  type: TradingOrderType;
  limitPrice?: string | null;
  stopPrice?: string | null;
  stopLossPrice?: string | null;
  takeProfitPrice?: string | null;
}

export interface PlacePaperOrderResult {
  order: TradingOrder;
  position: TradingPosition;
  trade: TradingTrade | null;
  executedPrice: string;
  realizedPnl: string;
  balance: string;
}
