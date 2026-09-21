import { api } from "@/lib/api-client";
import type {
  PlacePaperOrderInput,
  PlacePaperOrderResult,
  TradingAccount,
  TradingLedgerEntry,
  TradingOrder,
  TradingPosition,
  TradingTrade,
} from "../types";

export interface CreateTradingAccountInput {
  name: string;
  currency: string;
  startingBalance: number;
  leverage?: number;
}

function accountPath(organizationId: string) {
  return `/organizations/${organizationId}/trading-accounts`;
}

export function createDemoTradingAccount(
  organizationId: string,
  input: CreateTradingAccountInput,
): Promise<TradingAccount> {
  return api.post<TradingAccount>(
    accountPath(organizationId),
    input,
  );
}

export function getTradingAccounts(
  organizationId: string,
): Promise<TradingAccount[]> {
  return api.get<TradingAccount[]>(
    accountPath(organizationId),
  );
}

export function getTradingAccount(
  organizationId: string,
  accountId: string,
): Promise<TradingAccount> {
  return api.get<TradingAccount>(
    `${accountPath(organizationId)}/${accountId}`,
  );
}

export function addTradingFunds(
  organizationId: string,
  accountId: string,
  amount: number,
): Promise<TradingAccount> {
  return api.post<TradingAccount>(
    `${accountPath(organizationId)}/${accountId}/funds`,
    { amount },
  );
}

export function resetDemoTradingAccount(
  organizationId: string,
  accountId: string,
): Promise<TradingAccount> {
  return api.post<TradingAccount>(
    `${accountPath(organizationId)}/${accountId}/reset`,
  );
}

export function placePaperOrder(
  organizationId: string,
  accountId: string,
  input: PlacePaperOrderInput,
): Promise<PlacePaperOrderResult> {
  return api.post<PlacePaperOrderResult>(
    `${accountPath(organizationId)}/${accountId}/orders`,
    input,
  );
}

export function closeTradingPosition(
  organizationId: string,
  accountId: string,
  positionId: string,
): Promise<PlacePaperOrderResult> {
  return api.post<PlacePaperOrderResult>(
    `${accountPath(organizationId)}/${accountId}/positions/${positionId}/close`,
  );
}

export function reverseTradingPosition(
  organizationId: string,
  accountId: string,
  positionId: string,
): Promise<PlacePaperOrderResult> {
  return api.post<PlacePaperOrderResult>(
    `${accountPath(organizationId)}/${accountId}/positions/${positionId}/reverse`,
  );
}

export function updatePendingTradingOrder(
  organizationId: string,
  accountId: string,
  orderId: string,
  price: string,
): Promise<TradingOrder> {
  return api.patch<TradingOrder>(
    `${accountPath(organizationId)}/${accountId}/orders/${orderId}`,
    { price },
  );
}

export function cancelTradingOrder(
  organizationId: string,
  accountId: string,
  orderId: string,
): Promise<TradingOrder> {
  return api.post<TradingOrder>(
    `${accountPath(organizationId)}/${accountId}/orders/${orderId}/cancel`,
  );
}

export function cancelAllTradingOrders(
  organizationId: string,
  accountId: string,
): Promise<TradingOrder[]> {
  return api.post<TradingOrder[]>(
    `${accountPath(organizationId)}/${accountId}/orders/cancel-all`,
  );
}

export function flattenAllTradingPositions(
  organizationId: string,
  accountId: string,
): Promise<PlacePaperOrderResult[]> {
  return api.post<PlacePaperOrderResult[]>(
    `${accountPath(organizationId)}/${accountId}/positions/flatten-all`,
  );
}

export function getTradingOrders(
  organizationId: string,
  accountId: string,
): Promise<TradingOrder[]> {
  return api.get<TradingOrder[]>(
    `${accountPath(organizationId)}/${accountId}/orders`,
  );
}

export function getTradingPositions(
  organizationId: string,
  accountId: string,
): Promise<TradingPosition[]> {
  return api.get<TradingPosition[]>(
    `${accountPath(organizationId)}/${accountId}/positions`,
  );
}

export interface UpdateTradingPositionRiskInput {
  stopLossPrice?: string | null;
  takeProfitPrice?: string | null;
}

export function updateTradingPositionRisk(
  organizationId: string,
  accountId: string,
  positionId: string,
  input: UpdateTradingPositionRiskInput,
): Promise<TradingPosition> {
  return api.patch<TradingPosition>(
    `${accountPath(organizationId)}/${accountId}/positions/${positionId}`,
    input,
  );
}

export function getTradingTrades(
  organizationId: string,
  accountId: string,
): Promise<TradingTrade[]> {
  return api.get<TradingTrade[]>(
    `${accountPath(organizationId)}/${accountId}/trades`,
  );
}

export function getTradingLedger(
  organizationId: string,
  accountId: string,
): Promise<TradingLedgerEntry[]> {
  return api.get<TradingLedgerEntry[]>(
    `${accountPath(organizationId)}/${accountId}/ledger`,
  );
}
