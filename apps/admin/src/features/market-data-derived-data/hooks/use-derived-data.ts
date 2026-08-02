import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { DERIVED_INDICATOR_KEYS } from "@/features/market-data-shared/types";
import type { DerivedIndicatorSnapshot } from "@/features/market-data-shared/types";

export interface GenerateDerivedDataInput {
  instrumentId: string;
  interval: string;
}

/** `DerivedDataController` computes 8 named price/volume indicators
 * (ATR/RSI/EMA/SMA/MACD/Bollinger Bands/VWAP/Pivot Points) plus
 * Trend/Volatility labels for one instrument/interval's latest bar — see
 * `DerivedDataService`'s own header comment for why "Aggregations" and
 * "Resampling" (the prompt's other two requirements) don't exist as
 * separate backend concepts: this pipeline only ever computes the
 * latest-bar snapshot, not resampled/aggregated series. */
export function useGenerateDerivedData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GenerateDerivedDataInput) => api.post<{ indicatorsWritten: number }>("/market-data/derived-data/generate", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["market-data", "derived-data"] }),
  });
}

export function useLatestIndicator(instrumentId: string | undefined, interval: string | undefined, indicatorKey: string | undefined) {
  return useQuery({
    queryKey: ["market-data", "derived-data", instrumentId, interval, indicatorKey],
    queryFn: () => api.get<DerivedIndicatorSnapshot[]>(`/market-data/derived-data/${instrumentId}/${interval}/${indicatorKey}/latest`),
    enabled: !!instrumentId && !!interval && !!indicatorKey,
  });
}

/** Fans out over the fixed, known set of 10 indicator keys (not a
 * variable-length list) to show every indicator's latest value for one
 * instrument/interval at once, since `DerivedDataController` only
 * exposes a per-indicator-key lookup, not a "give me all indicators"
 * endpoint. */
export function useLatestIndicatorsFanout(instrumentId: string | undefined, interval: string | undefined) {
  const results = useQueries({
    queries: DERIVED_INDICATOR_KEYS.map((key) => ({
      queryKey: ["market-data", "derived-data", instrumentId, interval, key],
      queryFn: () => api.get<DerivedIndicatorSnapshot[]>(`/market-data/derived-data/${instrumentId}/${interval}/${key}/latest`),
      enabled: !!instrumentId && !!interval,
    })),
  });
  const byKey: Record<string, DerivedIndicatorSnapshot | undefined> = {};
  DERIVED_INDICATOR_KEYS.forEach((key, i) => {
    byKey[key] = results[i]?.data?.[0];
  });
  return { byKey, isLoading: results.some((r) => r.isLoading), isFetched: results.every((r) => r.isFetched) };
}

