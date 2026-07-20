import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AssetClass, Candle, Exchange, Instrument, InstrumentStatus, MarketDataPage, Quote, CandleInterval } from "../types";

export interface InstrumentSearchParams {
  query?: string;
  assetClass?: AssetClass;
  status?: InstrumentStatus;
  page?: number;
  pageSize?: number;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function useInstruments(params: InstrumentSearchParams = {}) {
  return useQuery({
    queryKey: ["market-data", "instruments", params],
    queryFn: () =>
      api.get<MarketDataPage<Instrument>>(
        `/market-data/instruments${buildQuery({ query: params.query, assetClass: params.assetClass, status: params.status, page: params.page ?? 1, pageSize: params.pageSize ?? 50 })}`,
      ),
    // Symbol search should feel live without hammering the API on every
    // keystroke — a moderate staleTime plus the caller's own debounce
    // (see use-debounced-value) is the combination that achieves that.
    staleTime: 15_000,
  });
}

export function useInstrument(instrumentId: string | null) {
  return useQuery({
    queryKey: ["market-data", "instrument", instrumentId],
    queryFn: () => api.get<Instrument>(`/market-data/instruments/${instrumentId}`),
    enabled: !!instrumentId,
  });
}

/** Latest quote for each of up to 100 instrument ids. Kept fresh on a
 * short poll — this is the closest this REST API gets to "live" pricing
 * (there's no streaming/WebSocket quote endpoint), an honest, explicit
 * choice over pretending to be real-time. */
export function useQuotes(instrumentIds: readonly string[]) {
  const ids = [...instrumentIds].sort();
  return useQuery({
    queryKey: ["market-data", "quotes", ids],
    queryFn: () => {
      const qs = new URLSearchParams();
      ids.forEach((id) => qs.append("instrumentIds", id));
      return api.get<Quote[]>(`/market-data/quotes?${qs.toString()}`);
    },
    enabled: ids.length > 0,
    refetchInterval: 10_000,
  });
}

export function useExchanges() {
  return useQuery({
    queryKey: ["market-data", "exchanges"],
    queryFn: () => api.get<Exchange[]>("/market-data/exchanges"),
    staleTime: 60_000,
  });
}

export interface CandleParams {
  instrumentId: string;
  interval: CandleInterval;
  from: string;
  to: string;
  limit?: number;
}

export function useCandles(params: CandleParams | null) {
  return useQuery({
    queryKey: ["market-data", "candles", params],
    queryFn: () =>
      api.get<Candle[]>(
        `/market-data/candles${buildQuery({
          instrumentId: params!.instrumentId,
          interval: params!.interval,
          from: params!.from,
          to: params!.to,
          limit: params!.limit ?? 500,
        })}`,
      ),
    enabled: params !== null,
  });
}
