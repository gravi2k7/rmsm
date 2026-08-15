"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
} from "@rmsm/ui";
import { cn } from "@rmsm/ui";
import {
  useInstrument,
  useQuotes,
  useCandles,
} from "@/features/market/hooks/use-market-data";
import { RMSMCandlestickChart } from "@/features/market/components/rmsm-candlestick-chart";
import { MarketIndicatorControls } from "@/features/market/components/market-indicator-controls";
import { MarketIndicatorPane } from "@/features/market/components/market-indicator-pane";
import {
  DEFAULT_INDICATORS,
  type IndicatorConfig,
} from "@/features/market/indicators/config";
import type { CandleInterval } from "@/features/market/types";
import { toNumber } from "@/features/market/types";
import { useWatchlistStore } from "@/features/watchlists/store";

const TIMEFRAMES: Array<{
  value: CandleInterval;
  label: string;
  lookbackHours: number;
}> = [
  { value: "ONE_MINUTE", label: "1m", lookbackHours: 1 },
  { value: "FIVE_MINUTES", label: "5m", lookbackHours: 4 },
  { value: "FIFTEEN_MINUTES", label: "15m", lookbackHours: 12 },
  { value: "THIRTY_MINUTES", label: "30m", lookbackHours: 24 },
  { value: "ONE_HOUR", label: "1H", lookbackHours: 48 },
  { value: "FOUR_HOURS", label: "4H", lookbackHours: 24 * 14 },
  { value: "ONE_DAY", label: "1D", lookbackHours: 24 * 90 },
];

export default function InstrumentChartPage() {
  const params = useParams<{ instrumentId: string }>();
  const instrumentId = params.instrumentId;

  const [interval, setInterval] = useState<CandleInterval>("ONE_MINUTE");

  const [indicators, setIndicators] =
    useState<IndicatorConfig[]>(DEFAULT_INDICATORS);

  const instrumentQuery = useInstrument(instrumentId);
  const quotesQuery = useQuotes(instrumentId ? [instrumentId] : []);
  const quote = quotesQuery.data?.[0];

  const selectedTimeframe = useMemo(
    () =>
      TIMEFRAMES.find((item) => item.value === interval) ??
      TIMEFRAMES[0]!,
    [interval],
  );

  const candleParams = useMemo(() => {
    if (!instrumentId) {
      return null;
    }

    const to = new Date();
    const from = new Date(
      to.getTime() - selectedTimeframe.lookbackHours * 60 * 60 * 1000,
    );

    return {
      instrumentId,
      interval,
      from: from.toISOString(),
      to: to.toISOString(),
      limit: 500,
    };
  }, [instrumentId, interval, selectedTimeframe]);

  const candlesQuery = useCandles(candleParams);

  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);
  const recordRecentlyViewed = useWatchlistStore(
    (s) => s.recordRecentlyViewed,
  );
  const isFavorite = favorites.includes(instrumentId);

  const toggleIndicator = (id: string) => {
    setIndicators((current) =>
      current.map((indicator) =>
        indicator.id === id
          ? { ...indicator, visible: !indicator.visible }
          : indicator,
      ),
    );
  };

  const visiblePaneIndicators = indicators.filter(
    (indicator) => indicator.visible && indicator.placement === "pane",
  );

  useEffect(() => {
    if (instrumentId) {
      recordRecentlyViewed(instrumentId);
    }
  }, [instrumentId, recordRecentlyViewed]);

  if (instrumentQuery.isLoading) {
    return (
      <div className="flex min-h-full flex-col gap-4">
        <Skeleton className="h-8 w-64 shrink-0" />
        <Skeleton className="min-h-0 flex-1 w-full" />
      </div>
    );
  }

  if (instrumentQuery.isError || !instrumentQuery.data) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Couldn&apos;t load this instrument. It may not exist, or you may not
          have access.
        </AlertDescription>
      </Alert>
    );
  }

  const instrument = instrumentQuery.data;

  const lastPrice = toNumber(quote?.lastPrice);
  const bidPrice = toNumber(quote?.bidPrice);
  const askPrice = toNumber(quote?.askPrice);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/market" aria-label="Back to Market Watch">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{instrument.symbol}</h1>

              <Badge variant="outline">{instrument.assetClass}</Badge>

              <button
                type="button"
                onClick={() => toggleFavorite(instrument.id)}
                aria-label={
                  isFavorite
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
                aria-pressed={isFavorite}
                className="rounded-sm"
              >
                <Star
                  className={cn(
                    "h-4 w-4 text-muted-foreground",
                    isFavorite && "fill-warning text-warning",
                  )}
                  aria-hidden="true"
                />
              </button>
            </div>

            <p className="text-sm text-muted-foreground">
              {instrument.name}
            </p>
          </div>
        </div>

        <div className="flex gap-6 text-right text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Last</div>
            <div className="tabular-nums font-medium">
              {lastPrice?.toFixed(5) ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Bid</div>
            <div className="tabular-nums font-medium">
              {bidPrice?.toFixed(5) ?? "—"}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Ask</div>
            <div className="tabular-nums font-medium">
              {askPrice?.toFixed(5) ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <Card className="min-h-0 flex-1">
        <CardContent className="flex h-full min-h-0 flex-col p-2">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-2 pb-2">
            <div
              className="flex items-center gap-1"
              role="group"
              aria-label="Chart timeframe"
            >
              {TIMEFRAMES.map((timeframe) => {
                const active = timeframe.value === interval;

                return (
                  <Button
                    key={timeframe.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "ghost"}
                    aria-pressed={active}
                    onClick={() => setInterval(timeframe.value)}
                  >
                    {timeframe.label}
                  </Button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <MarketIndicatorControls
                indicators={indicators}
                onToggle={toggleIndicator}
                onUpdate={(id, patch) => {
                  setIndicators((current) =>
                    current.map((indicator) =>
                      indicator.id === id
                        ? { ...indicator, ...patch }
                        : indicator,
                    ),
                  );
                }}
              />

              <span className="text-xs text-muted-foreground">
                {selectedTimeframe.label} · {candlesQuery.data?.length ?? 0} candles
              </span>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col pt-2">
            {candlesQuery.isError && (
              <Alert variant="destructive" className="mb-2">
                <AlertDescription>
                  Couldn&apos;t load historical candles for this instrument.
                </AlertDescription>
              </Alert>
            )}

            {candlesQuery.isLoading ? (
              <Skeleton className="h-full min-h-0 w-full" />
            ) : candlesQuery.data && candlesQuery.data.length > 0 ? (
              <div className="h-full min-h-0">
                <div className="flex h-full min-h-0 flex-col gap-2">
                  <div className="min-h-0 flex-1">
                    <RMSMCandlestickChart
                      candles={candlesQuery.data}
                      indicators={indicators}
                    />
                  </div>

                  {visiblePaneIndicators.map((indicator) => (
                    <MarketIndicatorPane
                      key={indicator.id}
                      candles={candlesQuery.data.map((candle) => ({
                        time: Math.floor(
                          new Date(candle.eventTime).getTime() / 1000,
                        ),
                        open: Number(candle.open),
                        high: Number(candle.high),
                        low: Number(candle.low),
                        close: Number(candle.close),
                        volume: Number(candle.volume),
                      }))}
                      indicator={indicator}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full min-h-0 items-center justify-center text-sm text-muted-foreground">
                No candle data is available for the selected time range.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
