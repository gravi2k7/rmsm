import {
  prisma,
  TradingPositionStatus,
  TradingLedgerEntryType,
  type DbClient,
  type TradingAccount,
  type TradingLedgerEntry,
  type TradingFill,
  type TradingOrder,
  type TradingPosition,
  type TradingTrade,
  type TradingOrderSide,
  type TradingOrderStatus,
  type TradingOrderType,
  type TradingPositionSide,
  type Prisma,
} from "@rmsm/database";
import type { PaperTradingRepository } from "../../../../application/trading/paper-trading.repository";

export class PrismaPaperTradingRepository
  implements PaperTradingRepository
{
  async updateAccountBalance(
    accountId: string,
    balance: string,
    client: DbClient = prisma,
  ): Promise<TradingAccount> {
    return client.tradingAccount.update({
      where: {
        id: accountId,
      },
      data: {
        balance,
        status: "ACTIVE",
      },
    });
  }

  async createLedgerEntry(
    data: {
      accountId: string;
      type: TradingLedgerEntryType;
      amount: string;
      balanceAfter: string;
      reference?: string;
      metadata?: Record<string, unknown>;
    },
    client: DbClient = prisma,
  ): Promise<TradingLedgerEntry> {
    return client.tradingLedgerEntry.create({
      data: {
        accountId: data.accountId,
        type: data.type,
        amount: data.amount,
        balanceAfter: data.balanceAfter,
        reference: data.reference,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async createOrder(
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
    client: DbClient = prisma,
  ): Promise<TradingOrder> {
    return client.tradingOrder.create({
      data: {
        accountId: data.accountId,
        instrumentId: data.instrumentId,
        side: data.side,
        type: data.type,
        quantity: data.quantity,
        limitPrice: data.limitPrice,
        stopPrice: data.stopPrice,
        status: data.status,
        requestedPrice: data.requestedPrice,
        executedPrice: data.executedPrice,
        rejectionReason: data.rejectionReason,
        filledAt: data.filledAt,
      },
    });
  }

  async createFill(
    data: {
      orderId: string;
      price: string;
      quantity: string;
      commission: string;
      filledAt?: Date;
    },
    client: DbClient = prisma,
  ): Promise<TradingFill> {
    return client.tradingFill.create({
      data: {
        orderId: data.orderId,
        price: data.price,
        quantity: data.quantity,
        commission: data.commission,
        filledAt: data.filledAt,
      },
    });
  }

  async findOpenPosition(
    accountId: string,
    instrumentId: string,
    side: TradingPositionSide,
    client: DbClient = prisma,
  ): Promise<TradingPosition | null> {
    return client.tradingPosition.findFirst({
      where: {
        accountId,
        instrumentId,
        side,
        status: TradingPositionStatus.OPEN,
      },
      orderBy: {
        openedAt: "desc",
      },
    });
  }

  async findOpenLongPosition(
    accountId: string,
    instrumentId: string,
    client: DbClient = prisma,
  ): Promise<TradingPosition | null> {
    return client.tradingPosition.findFirst({
      where: {
        accountId,
        instrumentId,
        side: "LONG",
        status: TradingPositionStatus.OPEN,
      },
      orderBy: {
        openedAt: "desc",
      },
    });
  }

  async findPosition(
    accountId: string,
    positionId: string,
    client: DbClient = prisma,
  ): Promise<TradingPosition | null> {
    return client.tradingPosition.findFirst({
      where: {
        id: positionId,
        accountId,
      },
    });
  }

  async createPosition(
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
    client: DbClient = prisma,
  ): Promise<TradingPosition> {
    return client.tradingPosition.create({
      data: {
        accountId: data.accountId,
        instrumentId: data.instrumentId,
        side: data.side,
        quantity: data.quantity,
        averageEntryPrice: data.averageEntryPrice,
        stopLossPrice: data.stopLossPrice,
        takeProfitPrice: data.takeProfitPrice,
        status: data.status,
        openedAt: data.openedAt,
      },
    });
  }

  async updatePosition(
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
    client: DbClient = prisma,
  ): Promise<TradingPosition> {
    return client.tradingPosition.update({
      where: {
        id: positionId,
      },
      data: {
        quantity: data.quantity,
        averageEntryPrice: data.averageEntryPrice,
        stopLossPrice: data.stopLossPrice,
        takeProfitPrice: data.takeProfitPrice,
        status: data.status,
        closedAt: data.closedAt,
        averageExitPrice: data.averageExitPrice,
        realizedPnl: data.realizedPnl,
      },
    });
  }

  async createTrade(
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
    client: DbClient = prisma,
  ): Promise<TradingTrade> {
    return client.tradingTrade.create({
      data: {
        accountId: data.accountId,
        instrumentId: data.instrumentId,
        side: data.side,
        quantity: data.quantity,
        entryPrice: data.entryPrice,
        exitPrice: data.exitPrice,
        realizedPnl: data.realizedPnl,
        openedAt: data.openedAt,
        closedAt: data.closedAt,
      },
    });
  }

  async listOrders(
    accountId: string,
    client: DbClient = prisma,
  ): Promise<TradingOrder[]> {
    return client.tradingOrder.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    });
  }


  async findOrder(
    accountId: string,
    orderId: string,
    client: DbClient = prisma,
  ): Promise<TradingOrder | null> {
    return client.tradingOrder.findFirst({
      where: {
        id: orderId,
        accountId,
      },
    });
  }


  async updateOrder(
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
    client: DbClient = prisma,
  ): Promise<TradingOrder> {
    return client.tradingOrder.update({
      where: {
        id: orderId,
      },
      data: {
        status: data.status,
        triggeredAt: data.triggeredAt,
        executedPrice: data.executedPrice,
        filledAt: data.filledAt,
        rejectionReason: data.rejectionReason,
        limitPrice: data.limitPrice,
        stopPrice: data.stopPrice,
      },
    });
  }

  async listPositions(
    accountId: string,
    client: DbClient = prisma,
  ): Promise<TradingPosition[]> {
    return client.tradingPosition.findMany({
      where: { accountId },
      orderBy: { openedAt: "desc" },
    });
  }

  async listTrades(
    accountId: string,
    client: DbClient = prisma,
  ): Promise<TradingTrade[]> {
    return client.tradingTrade.findMany({
      where: { accountId },
      orderBy: { closedAt: "desc" },
    });
  }
}
