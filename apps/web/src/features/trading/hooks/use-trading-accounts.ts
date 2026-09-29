import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getTradingAccount,
  getTradingAccounts,
  getTradingLedger,
  getTradingOrders,
  getTradingPositions,
  getTradingTrades,
} from "../api/trading-api";

export function useTradingAccounts(
  organizationId: string | undefined,
) {
  return useQuery({
    queryKey: ["trading-accounts", organizationId],
    queryFn: () => getTradingAccounts(organizationId!),
    enabled: !!organizationId,
    refetchInterval: 10_000,
  });
}

export function useTradingAccount(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  return useQuery({
    queryKey: ["trading-account", organizationId, accountId],
    queryFn: () =>
      getTradingAccount(
        organizationId!,
        accountId!,
      ),
    enabled: !!organizationId && !!accountId,
    refetchInterval: 5_000,
  });
}

export function useTradingLedger(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  return useQuery({
    queryKey: ["trading-ledger", organizationId, accountId],
    queryFn: () =>
      getTradingLedger(
        organizationId!,
        accountId!,
      ),
    enabled: !!organizationId && !!accountId,
    refetchInterval: 10_000,
  });
}


export function useTradingOrders(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  return useQuery({
    queryKey: ["trading-orders", organizationId, accountId],
    queryFn: () =>
      getTradingOrders(
        organizationId!,
        accountId!,
      ),
    enabled: !!organizationId && !!accountId,
    refetchInterval: 5_000,
  });
}

export function useTradingPositions(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  return useQuery({
    queryKey: ["trading-positions", organizationId, accountId],
    queryFn: () =>
      getTradingPositions(
        organizationId!,
        accountId!,
      ),
    enabled: !!organizationId && !!accountId,
    refetchInterval: 5_000,
  });
}

export function useTradingTrades(
  organizationId: string | undefined,
  accountId: string | undefined,
) {
  return useQuery({
    queryKey: ["trading-trades", organizationId, accountId],
    queryFn: () =>
      getTradingTrades(
        organizationId!,
        accountId!,
      ),
    enabled: !!organizationId && !!accountId,
    refetchInterval: 10_000,
  });
}

export function useTradingPortfolioData(
  organizationId: string | undefined,
  accountIds: readonly string[],
) {
  const positionQueries = useQueries({
    queries: accountIds.map((accountId) => ({
      queryKey: ["trading-positions", organizationId, accountId],
      queryFn: () => getTradingPositions(organizationId!, accountId),
      enabled: !!organizationId && !!accountId,
      refetchInterval: 5_000,
    })),
  });

  const tradeQueries = useQueries({
    queries: accountIds.map((accountId) => ({
      queryKey: ["trading-trades", organizationId, accountId],
      queryFn: () => getTradingTrades(organizationId!, accountId),
      enabled: !!organizationId && !!accountId,
      refetchInterval: 10_000,
    })),
  });

  return {
    positionQueries,
    tradeQueries,
    isLoading:
      positionQueries.some((query) => query.isLoading) ||
      tradeQueries.some((query) => query.isLoading),
    isError:
      positionQueries.some((query) => query.isError) ||
      tradeQueries.some((query) => query.isError),
  };
}
