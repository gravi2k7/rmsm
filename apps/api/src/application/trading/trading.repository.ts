import type {
  DbClient,
  TradingAccount,
  TradingAccountType,
  TradingLedgerEntry,
  TradingLedgerEntryType,
} from "@rmsm/database";

export interface TradingAccountRepository {
  create(
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
    client?: DbClient,
  ): Promise<TradingAccount>;

  findById(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    client?: DbClient,
  ): Promise<TradingAccount | null>;

  findMany(
    organizationId: string,
    ownerUserId: string,
    client?: DbClient,
  ): Promise<TradingAccount[]>;

  updateBalance(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    balance: number,
    status?: TradingAccount["status"],
    client?: DbClient,
  ): Promise<TradingAccount>;

  addLedgerEntry(
    data: {
      accountId: string;
      type: TradingLedgerEntryType;
      amount: number;
      balanceAfter: number;
      reference?: string;
      metadata?: Record<string, unknown>;
    },
    client?: DbClient,
  ): Promise<TradingLedgerEntry>;

  listLedger(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    client?: DbClient,
  ): Promise<TradingLedgerEntry[]>;
}
