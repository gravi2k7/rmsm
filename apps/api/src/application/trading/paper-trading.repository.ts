import type {
  DbClient,
  TradingFill,
  TradingOrder,
  TradingOrderSide,
  TradingOrderStatus,
  TradingOrderType,
  TradingPosition,
  TradingPositionSide,
  TradingPositionStatus,
  TradingTrade,
} from "@rmsm/database";

export interface PaperTradingRepository {
  updateAccountBalance(
    accountId: string,
    balance: string,
    client?: DbClient,
  ): Promise<import("@rmsm/database").TradingAccount>;

  createLedgerEntry(
    data: {
      accountId: string;
      type: import("@rmsm/database").TradingLedgerEntryType;
      amount: string;
      balanceAfter: string;
      reference?: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient,
  ): Promise<import("@rmsm/database").TradingLedgerEntry>;

  createOrder(
    data: {
      accountId: string;
      instrumentId: string;
      side: TradingOrderSide;
      type: TradingOrderType;
      quantity: string;
      limitPrice?: string;
      stopPrice?: string;
      status: TradingOrderStatus;
      requestedPrice?: string;
      executedPrice?: string;
      rejectionReason?: string;
      filledAt?: Date;
    },
    client?: DbClient,
  ): Promise<TradingOrder>;

  createFill(
    data: {
      orderId: string;
      price: string;
      quantity: string;
      commission: string;
      filledAt?: Date;
    },
    client?: DbClient,
  ): Promise<TradingFill>;

  findOpenPosition(
    accountId: string,
    instrumentId: string,
    side: TradingPositionSide,
    client?: DbClient,
  ): Promise<TradingPosition | null>;

  findOpenLongPosition(
    accountId: string,
    instrumentId: string,
    client?: DbClient,
  ): Promise<TradingPosition | null>;

  findPosition(
    accountId: string,
    positionId: string,
    client?: DbClient,
  ): Promise<TradingPosition | null>;

  createPosition(
    data: {
      accountId: string;
      instrumentId: string;
      side: TradingPositionSide;
      quantity: string;
      averageEntryPrice: string;
      stopLossPrice?: string | null;
      takeProfitPrice?: string | null;
      status: TradingPositionStatus;
      openedAt?: Date;
    },
    client?: DbClient,
  ): Promise<TradingPosition>;

  updatePosition(
    positionId: string,
    data: {
      quantity?: string;
      averageEntryPrice?: string;
      stopLossPrice?: string | null;
      takeProfitPrice?: string | null;
      status?: TradingPositionStatus;
      closedAt?: Date | null;
      averageExitPrice?: string | null;
      realizedPnl?: string | null;
    },
    client?: DbClient,
  ): Promise<TradingPosition>;

  createTrade(
    data: {
      accountId: string;
      instrumentId: string;
      side: TradingPositionSide;
      quantity: string;
      entryPrice: string;
      exitPrice: string;
      realizedPnl: string;
      openedAt: Date;
      closedAt: Date;
    },
    client?: DbClient,
  ): Promise<TradingTrade>;

  listOrders(
    accountId: string,
    client?: DbClient,
  ): Promise<TradingOrder[]>;

  findOrder(
    accountId: string,
    orderId: string,
    client?: DbClient,
  ): Promise<TradingOrder | null>;

  updateOrder(
    orderId: string,
    data: {
      status?: TradingOrderStatus;
      triggeredAt?: Date | null;
      executedPrice?: string | null;
      filledAt?: Date | null;
      rejectionReason?: string | null;
      limitPrice?: string | null;
      stopPrice?: string | null;
    },
    client?: DbClient,
  ): Promise<TradingOrder>;

  listPositions(
    accountId: string,
    client?: DbClient,
  ): Promise<TradingPosition[]>;

  listTrades(
    accountId: string,
    client?: DbClient,
  ): Promise<TradingTrade[]>;
}
