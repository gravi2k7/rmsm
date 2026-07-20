import { useQueries, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { computeUnrealizedPnl } from "@/features/portfolio/lib/performance";
import type { Position } from "@/features/portfolio/types";
import type { Instrument, MarketDataPage, Quote } from "@/features/market/types";
import { toNumber } from "@/features/market/types";

const MAX_SYMBOLS_TO_RESOLVE = 15;

export function useUnrealizedPnl(positions: readonly Position[] | undefined) {
  const openPositions = (positions ?? []).filter((p) => p.status === "OPEN");
  const uniqueSymbols = Array.from(new Set(openPositions.map((p) => p.symbolCode))).slice(0, MAX_SYMBOLS_TO_RESOLVE);

  const symbolLookups = useQueries({
    queries: uniqueSymbols.map((symbolCode) => ({
      queryKey: ["market-data", "resolve-symbol", symbolCode],
      queryFn: () => api.get<MarketDataPage<Instrument>>(`/market-data/instruments?query=${encodeURIComponent(symbolCode)}&pageSize=5`),
      staleTime: 60_000,
    })),
  });

  const resolvedIds = symbolLookups
    .map((q, i) => {
      const symbolCode = uniqueSymbols[i];
      if (symbolCode === undefined) return null;
      const match = q.data?.data.find((instrument) => instrument.symbol.toUpperCase() === symbolCode.toUpperCase());
      return match ? { symbolCode, instrumentId: match.id } : null;
    })
    .filter((x): x is { symbolCode: string; instrumentId: string } => x !== null);

  const quotesQuery = useQuery({
    queryKey: ["market-data", "unrealized-quotes", resolvedIds.map((r) => r.instrumentId)],
    queryFn: () => {
      const qs = new URLSearchParams();
      resolvedIds.forEach((r) => qs.append("instrumentIds", r.instrumentId));
      return api.get<Quote[]>(`/market-data/quotes?${qs.toString()}`);
    },
    enabled: resolvedIds.length > 0,
  });

  const isLoading = symbolLookups.some((q) => q.isLoading) || quotesQuery.isLoading;

  if (isLoading || openPositions.length === 0) {
    return { total: 0, resolvedCount: 0, unresolvedCount: openPositions.length, isLoading, truncated: uniqueSymbols.length < new Set(openPositions.map((p) => p.symbolCode)).size };
  }

  const priceBySymbol = new Map(resolvedIds.map((r) => [r.symbolCode.toUpperCase(), r.instrumentId]));

  const result = computeUnrealizedPnl(openPositions, (symbolCode: string) => {
    const instrumentId = priceBySymbol.get(symbolCode.toUpperCase());
    if (!instrumentId) return null;
    const quote = quotesQuery.data?.find((q) => q.instrumentId === instrumentId);
    return toNumber(quote?.lastPrice);
  });

  return { ...result, isLoading: false, truncated: uniqueSymbols.length < new Set(openPositions.map((p) => p.symbolCode)).size };
}
