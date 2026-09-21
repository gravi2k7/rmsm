import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TradingPosition } from "@/features/trading/types";
import type { Quote } from "@/features/market/types";

export function useTradingAccountUnrealizedPnl(
  positions: readonly TradingPosition[] | undefined,
) {
  const openPositions = (positions ?? []).filter(
    (position) => position.status === "OPEN",
  );

  const instrumentIds = Array.from(
    new Set(openPositions.map((position) => position.instrumentId)),
  );

  const quotesQuery = useQuery({
    queryKey: ["market-data", "trading-account-unrealized-quotes", instrumentIds],
    queryFn: () => {
      const qs = new URLSearchParams();

      for (const instrumentId of instrumentIds) {
        qs.append("instrumentIds", instrumentId);
      }

      return api.get<Quote[]>(
        `/market-data/quotes?${qs.toString()}`,
      );
    },
    enabled: instrumentIds.length > 0,
    refetchInterval: 10_000,
  });

  if (openPositions.length === 0) {
    return {
      total: 0,
      resolvedCount: 0,
      unresolvedCount: 0,
      isLoading: false,
    };
  }

  let total = 0;
  let resolvedCount = 0;

  for (const position of openPositions) {
    const quote = quotesQuery.data?.find(
      (item) => item.instrumentId === position.instrumentId,
    );

    const currentPrice = Number(quote?.lastPrice);

    if (!Number.isFinite(currentPrice)) {
      continue;
    }

    const quantity = Number(position.quantity);
    const entryPrice = Number(position.averageEntryPrice);

    if (!Number.isFinite(quantity) || !Number.isFinite(entryPrice)) {
      continue;
    }

    const direction = position.side === "LONG" ? 1 : -1;

    total += direction * (currentPrice - entryPrice) * quantity;
    resolvedCount += 1;
  }

  return {
    total,
    resolvedCount,
    unresolvedCount: openPositions.length - resolvedCount,
    isLoading: quotesQuery.isLoading,
  };
}
