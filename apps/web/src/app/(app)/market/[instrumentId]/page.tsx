"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Minus,
  MousePointer2,
  MoveUpRight,
  MoveVertical,
  PenTool,
  Square,
  Star,
  Type,
  TrendingUp,
} from "lucide-react";
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
import type { Candle, CandleInterval } from "@/features/market/types";
import { toNumber } from "@/features/market/types";
import type { DrawingType } from "@/features/market/drawings/types";
import { DRAWING_TOOL_DEFINITIONS } from "@/features/market/drawings/registry";
import { useWatchlistStore } from "@/features/watchlists/store";

const INITIAL_CANDLE_LIMIT = 5000;
const HISTORICAL_PAGE_SIZE = 5000;

const DRAWING_TOOL_ICONS = {
  SELECT: MousePointer2,
  TREND_LINE: TrendingUp,
  HORIZONTAL_LINE: Minus,
  VERTICAL_LINE: MoveVertical,
  RAY: MoveUpRight,
  RECTANGLE: Square,
  ARROW: ArrowUpRight,
  TEXT: Type,

  PARALLEL_CHANNEL: MoveUpRight,
  PRICE_CHANNEL: MoveVertical,
  REGRESSION_CHANNEL: TrendingUp,

  FIB_RETRACEMENT: Star,
  FIB_EXTENSION: Star,
  FIB_PROJECTION: Star,
  FIB_TIME: Star,

  ABCD: Square,
  XABCD: Square,
  HEAD_SHOULDERS: Star,
  TRIANGLE: Square,
  WEDGE: Square,

  FORECAST: TrendingUp,
  PROJECTION: ArrowUpRight,

  MEASURE_PRICE: Minus,
  MEASURE_TIME: MoveVertical,
  MEASURE_PRICE_TIME: MoveUpRight,
  MEASURE_RANGE: Square,
} as const;

const TIMEFRAMES: Array<{
  value: CandleInterval;
  label: string;
  history: {
    years?: number;
    months?: number;
    days?: number;
  };
  initialLimit: number;
}> = [
  {
    value: "ONE_MINUTE",
    label: "1m",
    history: { days: 30 },
    initialLimit: INITIAL_CANDLE_LIMIT,
  },
  {
    value: "FIVE_MINUTES",
    label: "5m",
    history: { days: 60 },
    initialLimit: INITIAL_CANDLE_LIMIT,
  },
  {
    value: "FIFTEEN_MINUTES",
    label: "15m",
    history: { months: 6 },
    initialLimit: INITIAL_CANDLE_LIMIT,
  },
  {
    value: "THIRTY_MINUTES",
    label: "30m",
    history: { years: 1 },
    initialLimit: INITIAL_CANDLE_LIMIT,
  },
  {
    value: "ONE_HOUR",
    label: "1H",
    history: { years: 2 },
    initialLimit: INITIAL_CANDLE_LIMIT,
  },
  {
    value: "FOUR_HOURS",
    label: "4H",
    history: { years: 4 },
    initialLimit: INITIAL_CANDLE_LIMIT,
  },
  {
    value: "ONE_DAY",
    label: "1D",
    history: { years: 5 },
    initialLimit: 1825,
  },
  {
    value: "ONE_WEEK",
    label: "1W",
    history: { years: 10 },
    initialLimit: 520,
  },
  {
    value: "ONE_MONTH",
    label: "1M",
    history: { years: 10 },
    initialLimit: 120,
  },
];

function getHistoryStart(
  end: Date,
  history: {
    years?: number;
    months?: number;
    days?: number;
  },
): Date {
  const start = new Date(end);

  if (history.years) {
    start.setFullYear(start.getFullYear() - history.years);
  }

  if (history.months) {
    start.setMonth(start.getMonth() - history.months);
  }

  if (history.days) {
    start.setDate(start.getDate() - history.days);
  }

  return start;
}


export default function InstrumentChartPage() {
  const params = useParams<{ instrumentId: string }>();
  const instrumentId = params.instrumentId;

  const [interval, setInterval] = useState<CandleInterval>("ONE_MINUTE");
  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingType>("SELECT");

  const [drawingToolsOpen, setDrawingToolsOpen] =
    useState(false);

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

  const [olderCursor, setOlderCursor] = useState<string | undefined>();
  const [loadedCandles, setLoadedCandles] = useState<Candle[]>([]);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);

  const candleParams = useMemo(() => {
    if (!instrumentId) {
      return null;
    }

    const to = new Date();
    const from = getHistoryStart(to, selectedTimeframe.history);

    return {
      instrumentId,
      interval,
      from: from.toISOString(),
      to: to.toISOString(),
      limit: olderCursor
        ? HISTORICAL_PAGE_SIZE
        : selectedTimeframe.initialLimit,
      before: olderCursor,
    };
  }, [
    instrumentId,
    interval,
    selectedTimeframe,
    olderCursor,
  ]);

  const candlesQuery = useCandles(candleParams);

  // Render the active timeframe query directly.
  // Only use accumulated candles while paging backwards for older history.
  const displayCandles =
    olderCursor !== undefined
      ? loadedCandles
      : (candlesQuery.data ?? []);

  // A timeframe/instrument change starts a new candle history window.
  // Reset pagination state first; the synchronization effect below then
  // loads the current query page for the newly selected timeframe.
  useEffect(() => {
    setOlderCursor(undefined);
    setLoadedCandles([]);
    setHasMoreOlder(true);
  }, [instrumentId, interval]);

  useEffect(() => {
    const page = candlesQuery.data;

    if (!page) {
      return;
    }

    if (!olderCursor) {
      setLoadedCandles(page);
      setHasMoreOlder(page.length >= selectedTimeframe.initialLimit);
      return;
    }

    setLoadedCandles((current) => {
      const existingTimes = new Set(
        current.map((candle) => candle.eventTime),
      );

      const older = page.filter(
        (candle) => !existingTimes.has(candle.eventTime),
      );

      if (older.length === 0) {
        setHasMoreOlder(false);
        return current;
      }

      return [...older, ...current];
    });

    if (page.length < HISTORICAL_PAGE_SIZE) {
      setHasMoreOlder(false);
    }
  }, [
    candlesQuery.data,
    olderCursor,
    interval,
    selectedTimeframe.initialLimit,
  ]);

  const requestOlderCandles = () => {
    if (
      !hasMoreOlder ||
      candlesQuery.isFetching ||
      loadedCandles.length === 0
    ) {
      return;
    }

    setOlderCursor(loadedCandles[0]!.eventTime);
  };


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
    <div className="flex h-full min-h-0 flex-col gap-4">
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
              <div className="relative" role="group" aria-label="Drawing tools">
                <Button
                  type="button"
                  size="sm"
                  variant={activeDrawingTool !== "SELECT" ? "default" : "ghost"}
                  aria-label="Drawing tools"
                  aria-expanded={drawingToolsOpen}
                  title="Drawing tools"
                  onClick={() =>
                    setDrawingToolsOpen((open) => !open)
                  }
                >
                  <PenTool className="mr-1 h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Draw</span>
                </Button>

                {drawingToolsOpen && (
                  <div
                    className="absolute right-0 top-full z-50 mt-1 grid w-56 grid-cols-4 gap-1 rounded-md border bg-popover p-1 shadow-lg"
                    role="toolbar"
                    aria-label="Drawing tools"
                  >
                    {DRAWING_TOOL_DEFINITIONS.map((tool) => {
                      const active = tool.type === activeDrawingTool;
                      const Icon = DRAWING_TOOL_ICONS[tool.type];

                      return (
                        <Button
                          key={tool.type}
                          type="button"
                          size="icon"
                          variant={active ? "default" : "ghost"}
                          className="h-10 w-10"
                          aria-label={tool.label}
                          aria-pressed={active}
                          title={tool.label}
                          onClick={() => {
                            setActiveDrawingTool(tool.type);
                            setDrawingToolsOpen(false);
                          }}
                        >
                          <Icon
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Button>
                      );
                    })}
                  </div>
                )}
              </div>

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
            ) : displayCandles.length > 0 ? (
              <div className="h-full min-h-0">
                <div className="flex h-full min-h-0 flex-col gap-2">
                  <div className="min-h-0 flex-1">
                    <RMSMCandlestickChart
                      candles={displayCandles}
                      indicators={indicators}
                      activeDrawingTool={activeDrawingTool}
                      liveQuote={quote}
                      interval={interval}
                      onRequestOlder={requestOlderCandles}
                    />
                  </div>

                  {visiblePaneIndicators.map((indicator) => (
                    <MarketIndicatorPane
                      key={indicator.id}
                      candles={displayCandles.map((candle) => ({
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
