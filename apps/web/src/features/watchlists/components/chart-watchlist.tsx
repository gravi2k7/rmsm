"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api-client";
import {
  useInstrumentsBatch,
  useQuotes,
} from "@/features/market/hooks/use-market-data";
import {
  MarketDataRealtimeService,
} from "@/features/market/services/market-data-realtime.service";
import {
  MarketDataWebSocketClient,
  type MarketDataQuoteEvent,
} from "@/features/market/services/market-data-websocket.client";
import type { Candle, Instrument } from "@/features/market/types";
import { toNumber } from "@/features/market/types";
import { useWatchlistStore } from "@/features/watchlists/store";

interface ChartWatchlistProps {
  currentInstrumentId: string;
}

interface DailyCloseMap {
  [instrumentId: string]: number | null;
}

function formatPrice(value: string | null | undefined): string {
  const number = toNumber(value);

  if (number === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 5,
  }).format(number);
}

function formatChangePercent(
  currentPrice: string | null | undefined,
  previousClose: number | null | undefined,
): string {
  const current = toNumber(currentPrice);

  if (
    current === null ||
    previousClose === null ||
    previousClose === undefined ||
    previousClose === 0
  ) {
    return "—";
  }

  const change = ((current - previousClose) / previousClose) * 100;

  if (!Number.isFinite(change)) {
    return "—";
  }

  return `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
}

function changeClassName(
  currentPrice: string | null | undefined,
  previousClose: number | null | undefined,
): string {
  const current = toNumber(currentPrice);

  if (
    current === null ||
    previousClose === null ||
    previousClose === undefined ||
    previousClose === 0
  ) {
    return "text-muted-foreground";
  }

  if (current > previousClose) {
    return "text-success";
  }

  if (current < previousClose) {
    return "text-destructive";
  }

  return "text-muted-foreground";
}

function usePreviousDailyCloses(instrumentIds: readonly string[]) {
  const ids = useMemo(
    () => [...instrumentIds].sort(),
    [instrumentIds],
  );

  return useQuery({
    queryKey: ["market-data", "watchlist-daily-closes", ids],
    queryFn: async (): Promise<DailyCloseMap> => {
      if (ids.length === 0) {
        return {};
      }

      const now = new Date();

      const from = new Date(now);
      from.setUTCDate(from.getUTCDate() - 7);

      const to = new Date(now);

      const results = await Promise.all(
        ids.map(async (instrumentId) => {
          const params = new URLSearchParams({
            instrumentId,
            interval: "ONE_DAY",
            from: from.toISOString(),
            to: to.toISOString(),
            limit: "10",
          });

          const candles = await api.get<Candle[]>(
            `/market-data/candles?${params.toString()}`,
          );

          /*
           * The current day's candle may still be forming.
           * Use the newest candle whose eventTime belongs to a
           * completed UTC calendar day.
           */
          const previous = [...candles]
            .filter((candle) => {
              const eventDate = new Date(candle.eventTime);

              return Number.isFinite(eventDate.getTime());
            })
            .sort(
              (a, b) =>
                new Date(b.eventTime).getTime() -
                new Date(a.eventTime).getTime(),
            )[0];

          return [
            instrumentId,
            previous ? toNumber(previous.close) : null,
          ] as const;
        }),
      );

      return Object.fromEntries(results);
    },
    enabled: ids.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function ChartWatchlist({
  currentInstrumentId,
}: ChartWatchlistProps) {
  const router = useRouter();

  const activeWatchlistId = useWatchlistStore(
    (state) => state.activeWatchlistId,
  );

  const watchlists = useWatchlistStore(
    (state) => state.watchlists,
  );

  const watchlist = watchlists.find(
    (item) => item.id === activeWatchlistId,
  );

  const instrumentIds = watchlist?.instrumentIds ?? [];

  const [liveQuotes, setLiveQuotes] = useState<
    Map<string, MarketDataQuoteEvent>
  >(new Map());

  useEffect(() => {
    if (instrumentIds.length === 0) {
      setLiveQuotes(new Map());
      return;
    }

    let quoteListener:
      | ((quote: MarketDataQuoteEvent) => void)
      | undefined;

    const client = new MarketDataWebSocketClient({
      onQuote: (quote) => {
        quoteListener?.(quote);
      },
    });

    const service = new MarketDataRealtimeService({
      client,
      onQuote: (listener) => {
        quoteListener = listener;

        return () => {
          if (quoteListener === listener) {
            quoteListener = undefined;
          }
        };
      },
    });

    const removeQuoteListener = service.addQuoteListener(
      (quote) => {
        if (!instrumentIds.includes(quote.instrumentId)) {
          return;
        }

        setLiveQuotes((current) => {
          const next = new Map(current);
          next.set(quote.instrumentId, quote);
          return next;
        });
      },
    );

    service.subscribe(instrumentIds);

    return () => {
      removeQuoteListener();
      service.unsubscribe(instrumentIds);
      service.destroy();
    };
  }, [instrumentIds]);

  const instrumentsQuery = useInstrumentsBatch(instrumentIds);
  const quotesQuery = useQuotes(instrumentIds);
  const previousClosesQuery =
    usePreviousDailyCloses(instrumentIds);

  const instruments = useMemo(() => {
    const map: Record<string, Instrument> = {};

    for (const instrument of instrumentsQuery.data ?? []) {
      map[instrument.id] = instrument;
    }

    return map;
  }, [instrumentsQuery.data]);

  const quotes = useMemo(() => {
    const map: Record<
      string,
      NonNullable<typeof quotesQuery.data>[number]
    > = {};

    for (const quote of quotesQuery.data ?? []) {
      map[quote.instrumentId] = quote;
    }

    for (const [instrumentId, liveQuote] of liveQuotes) {
      const restQuote = map[instrumentId];

      map[instrumentId] = {
        id:
          restQuote?.id ??
          `${instrumentId}:${liveQuote.eventTime}`,
        instrumentId,
        bidPrice:
          liveQuote.bidPrice ??
          restQuote?.bidPrice ??
          null,
        askPrice:
          liveQuote.askPrice ??
          restQuote?.askPrice ??
          null,
        lastPrice:
          liveQuote.lastPrice ??
          restQuote?.lastPrice ??
          null,
        bidSize:
          liveQuote.bidSize ??
          restQuote?.bidSize ??
          null,
        askSize:
          liveQuote.askSize ??
          restQuote?.askSize ??
          null,
        eventTime: liveQuote.eventTime,
        providerId:
          restQuote?.providerId ?? "",
        source:
          restQuote?.source ?? "LIVE",
      };
    }

    return map;
  }, [quotesQuery.data, liveQuotes]);

  return (
    <section className="flex min-h-0 flex-1 flex-col border-l border-t bg-background">
      <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
        <span className="text-xs font-semibold uppercase tracking-wide">
          Watchlist
        </span>

        <span className="text-[10px] text-muted-foreground">
          {watchlist?.name ?? "My Watchlist"}
        </span>
      </div>

      <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_82px_64px] items-center gap-2 border-b px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Symbol</span>
        <span className="text-right">Price</span>
        <span className="text-right">Change %</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {instrumentIds.length === 0 ? (
          <div className="flex h-full min-h-24 items-center justify-center px-4 text-center text-xs text-muted-foreground">
            Add instruments to your watchlist to see them here.
          </div>
        ) : (
          <div>
            {instrumentIds.map((id) => {
              const instrument = instruments[id];
              const quote = quotes[id];
              const previousClose =
                previousClosesQuery.data?.[id] ?? null;
              const selected = id === currentInstrumentId;

              if (!instrument) {
                return null;
              }

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => router.push(`/trading?instrument=${id}`)}
                  className={[
                    "grid w-full grid-cols-[minmax(0,1fr)_82px_64px] items-center gap-2 px-3 py-2 text-left transition-colors",
                    "border-b border-border/70 hover:bg-muted/60",
                    selected ? "bg-muted font-medium" : "",
                  ].join(" ")}
                  aria-current={selected ? "page" : undefined}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    {selected ? (
                      <Star
                        className="h-3 w-3 shrink-0 fill-current"
                        aria-hidden="true"
                      />
                    ) : (
                      <span className="w-3 shrink-0" />
                    )}

                    <span className="truncate text-xs">
                      {instrument.symbol}
                    </span>
                  </span>

                  <span className="truncate text-right font-mono text-[11px] tabular-nums">
                    {formatPrice(
                      quote?.lastPrice ??
                        quote?.bidPrice ??
                        quote?.askPrice,
                    )}
                  </span>

                  <span
                    className={[
                      "truncate text-right font-mono text-[11px] tabular-nums",
                      changeClassName(
                        quote?.lastPrice ??
                          quote?.bidPrice ??
                          quote?.askPrice,
                        previousClose,
                      ),
                    ].join(" ")}
                  >
                    {formatChangePercent(
                      quote?.lastPrice ??
                        quote?.bidPrice ??
                        quote?.askPrice,
                      previousClose,
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
