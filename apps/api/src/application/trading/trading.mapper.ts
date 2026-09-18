import type {
  TradingAccount,
  TradingLedgerEntry,
} from "@rmsm/database";

export interface TradingAccountResponse {
  id: string;
  organizationId: string;
  ownerUserId: string;
  type: TradingAccount["type"];
  name: string;
  currency: string;
  startingBalance: string | null;
  balance: string;
  leverage: string;
  status: TradingAccount["status"];
  brokerConnectionId: string | null;
  brokerAccountId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface TradingLedgerEntryResponse {
  id: string;
  accountId: string;
  type: TradingLedgerEntry["type"];
  amount: string;
  balanceAfter: string;
  reference: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export function mapTradingAccount(
  account: TradingAccount,
): TradingAccountResponse {
  return {
    id: account.id,
    organizationId: account.organizationId,
    ownerUserId: account.ownerUserId,
    type: account.type,
    name: account.name,
    currency: account.currency,
    startingBalance:
      account.startingBalance?.toString() ?? null,
    balance: account.balance.toString(),
    leverage: account.leverage.toString(),
    status: account.status,
    brokerConnectionId: account.brokerConnectionId,
    brokerAccountId: account.brokerAccountId,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    closedAt:
      account.closedAt?.toISOString() ?? null,
  };
}

export function mapTradingLedgerEntry(
  entry: TradingLedgerEntry,
): TradingLedgerEntryResponse {
  return {
    id: entry.id,
    accountId: entry.accountId,
    type: entry.type,
    amount: entry.amount.toString(),
    balanceAfter: entry.balanceAfter.toString(),
    reference: entry.reference,
    metadata:
      entry.metadata &&
      typeof entry.metadata === "object" &&
      !Array.isArray(entry.metadata)
        ? (entry.metadata as Record<string, unknown>)
        : {},
    createdAt: entry.createdAt.toISOString(),
  };
}
