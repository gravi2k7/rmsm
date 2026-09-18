import {
  prisma,
  type DbClient,
  type TradingAccount,
  type TradingAccountType,
  type TradingLedgerEntry,
  type Prisma,
  TradingAccountStatus,
} from "@rmsm/database";
import type { TradingAccountRepository } from "../../../../application/trading/trading.repository";

export class PrismaTradingAccountRepository
  implements TradingAccountRepository
{
  async create(
    data: {
      organizationId: string;
      ownerUserId: string;
      type: TradingAccountType;
      name: string;
      currency: string;
      startingBalance: number;
      balance: number;
      leverage: number;
    },
    client: DbClient = prisma,
  ): Promise<TradingAccount> {
    return client.tradingAccount.create({
      data: {
        organizationId: data.organizationId,
        ownerUserId: data.ownerUserId,
        type: data.type,
        name: data.name,
        currency: data.currency.toUpperCase(),
        startingBalance: data.startingBalance,
        balance: data.balance,
        leverage: data.leverage,
      },
    });
  }

  async findById(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    client: DbClient = prisma,
  ): Promise<TradingAccount | null> {
    return client.tradingAccount.findFirst({
      where: {
        id: accountId,
        organizationId,
        ownerUserId,
      },
    });
  }

  async findMany(
    organizationId: string,
    ownerUserId: string,
    client: DbClient = prisma,
  ): Promise<TradingAccount[]> {
    return client.tradingAccount.findMany({
      where: {
        organizationId,
        ownerUserId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateBalance(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    balance: number,
    status: TradingAccount["status"] = TradingAccountStatus.ACTIVE,
    client: DbClient = prisma,
  ): Promise<TradingAccount> {
    const account = await client.tradingAccount.findFirst({
      where: {
        id: accountId,
        organizationId,
        ownerUserId,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      throw new Error("Trading account not found");
    }

    return client.tradingAccount.update({
      where: {
        id: account.id,
      },
      data: {
        balance,
        status,
      },
    });
  }

  async addLedgerEntry(
    data: {
      accountId: string;
      type: TradingLedgerEntry["type"];
      amount: number;
      balanceAfter: number;
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

  async listLedger(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    client: DbClient = prisma,
  ): Promise<TradingLedgerEntry[]> {
    const account = await client.tradingAccount.findFirst({
      where: {
        id: accountId,
        organizationId,
        ownerUserId,
      },
      select: {
        id: true,
      },
    });

    if (!account) {
      return [];
    }

    return client.tradingLedgerEntry.findMany({
      where: {
        accountId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }
}
