"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Star,
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
import type {
  DrawingState,
  DrawingType,
} from "@/features/market/drawings/types";

import {
  bringDrawingForward,
  bringDrawingToFront,
  createDrawingState,
  duplicateDrawing,
  removeDrawing,
  selectDrawing,
  sendDrawingBackward,
  sendDrawingToBack,
  setDrawingLocked,
  setDrawingVisibility,
} from "@/features/market/drawings/state";

import { MarketDrawingObjectManager } from "@/features/market/components/market-drawing-object-manager";
import { MarketDrawingToolsMenu } from "@/features/market/components/market-drawing-tools-menu";
import { MarketTimeframeMenu } from "@/features/market/components/market-timeframe-menu";
import { MarketChartViewControls } from "@/features/market/components/market-chart-view-controls";
import {
  MarketChartWorkspaceControls,
  type MarketChartLayout,
} from "@/features/market/components/market-chart-workspace-controls";
import { useWatchlistStore } from "@/features/watchlists/store";
import {
  useMarketWorkspaceStore,
} from "@/features/market/store";

const INITIAL_CANDLE_LIMIT = 5000;
const HISTORICAL_PAGE_SIZE = 5000;

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

  const persistedWorkspace = useMarketWorkspaceStore(
    (state) =>
      instrumentId
        ? state.workspaces[instrumentId]
        : undefined,
  );

  const setPersistedWorkspace =
    useMarketWorkspaceStore(
      (state) => state.setWorkspace,
    );

  const resetPersistedWorkspace =
    useMarketWorkspaceStore(
      (state) => state.resetWorkspace,
    );

  const [workspaceHydratedForInstrument, setWorkspaceHydratedForInstrument] =
    useState<string | null>(null);

  const [interval, setInterval] = useState<CandleInterval>("ONE_MINUTE");
  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingType>("SELECT");

  const [drawingToolsOpen, setDrawingToolsOpen] =
    useState(false);

  const [drawingObjectsOpen, setDrawingObjectsOpen] =
    useState(false);

  const [drawingState, setDrawingState] =
    useState<DrawingState>(() =>
      createDrawingState("SELECT"),
    );
  const chartViewControlsRef = useRef<{
    fitContent: () => void;
    resetView: () => void;
    zoomIn: () => void;
    zoomOut: () => void;
    autoScale: () => void;
  } | null>(null);

  const [volumeVisible, setVolumeVisible] =
    useState(true);

  const [chartLayout, setChartLayout] =
    useState<MarketChartLayout>("CHART_WITH_PANES");



  const [indicators, setIndicators] =
    useState<IndicatorConfig[]>(DEFAULT_INDICATORS);

  useEffect(() => {
    if (!instrumentId) {
      return;
    }

    if (workspaceHydratedForInstrument === instrumentId) {
      return;
    }

    if (persistedWorkspace) {
      setInterval(persistedWorkspace.interval);
      setActiveDrawingTool(
        persistedWorkspace.activeDrawingTool,
      );
      setVolumeVisible(
        persistedWorkspace.volumeVisible,
      );
      setChartLayout(
        persistedWorkspace.chartLayout,
      );

      setIndicators(
        persistedWorkspace.indicators.map(
          (indicator) => ({ ...indicator }),
        ),
      );

      setDrawingState({
        ...persistedWorkspace.drawingState,
        drawings: persistedWorkspace.drawingState.drawings.map(
          (drawing) => ({ ...drawing }),
        ),
      });
    } else {
      setInterval("ONE_MINUTE");
      setActiveDrawingTool("SELECT");
      setVolumeVisible(true);
      setChartLayout("CHART_WITH_PANES");
      setIndicators(
        DEFAULT_INDICATORS.map(
          (indicator) => ({ ...indicator }),
        ),
      );
      setDrawingState(createDrawingState("SELECT"));
    }

    setWorkspaceHydratedForInstrument(instrumentId);
  }, [
    instrumentId,
    persistedWorkspace,
    workspaceHydratedForInstrument,
  ]);

  useEffect(() => {
    if (
      !instrumentId ||
      workspaceHydratedForInstrument !== instrumentId
    ) {
      return;
    }

    setPersistedWorkspace(instrumentId, {
      interval,
      activeDrawingTool,
      volumeVisible,
      chartLayout,
      indicators: indicators.map(
        (indicator) => ({ ...indicator }),
      ),
      drawingState: {
        ...drawingState,
        drawings: drawingState.drawings.map(
          (drawing) => ({ ...drawing }),
        ),
      },
    });
  }, [
    instrumentId,
    workspaceHydratedForInstrument,
    interval,
    activeDrawingTool,
    volumeVisible,
    chartLayout,
    indicators,
    drawingState,
    setPersistedWorkspace,
  ]);

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

  const handleResetChartWorkspace = () => {
    setChartLayout("SPLIT");
    setVolumeVisible(true);
    setIndicators(DEFAULT_INDICATORS);
    setActiveDrawingTool("SELECT");
    setDrawingState(createDrawingState("SELECT"));
    chartViewControlsRef.current?.resetView();

    if (instrumentId) {
      resetPersistedWorkspace(instrumentId);
    }
  };

  const toggleIndicator = (id: string) => {
    setIndicators((current) =>
      current.map((indicator) =>
        indicator.id === id
          ? { ...indicator, visible: !indicator.visible }
          : indicator,
      ),
    );
  };

  const handleDrawingSelect = (
    id: string | null,
  ) => {
    setDrawingState((state) =>
      selectDrawing(state, id),
    );
  };

  const handleDrawingVisibility = (
    id: string,
    visible: boolean,
  ) => {
    setDrawingState((state) =>
      setDrawingVisibility(state, id, visible),
    );
  };

  const handleDrawingLock = (
    id: string,
    locked: boolean,
  ) => {
    setDrawingState((state) =>
      setDrawingLocked(state, id, locked),
    );
  };

  const handleDrawingDuplicate = (id: string) => {
    setDrawingState((state) =>
      duplicateDrawing(state, id),
    );
  };

  const handleDrawingDelete = (id: string) => {
    setDrawingState((state) =>
      removeDrawing(state, id),
    );
  };

  const handleDrawingBringForward = (id: string) => {
    setDrawingState((state) =>
      bringDrawingForward(state, id),
    );
  };

  const handleDrawingSendBackward = (id: string) => {
    setDrawingState((state) =>
      sendDrawingBackward(state, id),
    );
  };

  const handleDrawingBringToFront = (id: string) => {
    setDrawingState((state) =>
      bringDrawingToFront(state, id),
    );
  };

  const handleDrawingSendToBack = (id: string) => {
    setDrawingState((state) =>
      sendDrawingToBack(state, id),
    );
  };

  const handleShowAllDrawings = () => {
    setDrawingState((state) => ({
      ...state,
      drawings: state.drawings.map((drawing) => ({
        ...drawing,
        visible: true,
      })),
    }));
  };

  const handleHideAllDrawings = () => {
    setDrawingState((state) => ({
      ...state,
      drawings: state.drawings.map((drawing) => ({
        ...drawing,
        visible: false,
      })),
    }));
  };

  const handleDeleteAllDrawings = () => {
    setDrawingState((state) => {
      const drawings = state.drawings.filter(
        (drawing) => drawing.locked,
      );

      return {
        ...state,
        drawings,
        selectedDrawingId:
          state.selectedDrawingId &&
          drawings.some(
            (drawing) =>
              drawing.id === state.selectedDrawingId,
          )
            ? state.selectedDrawingId
            : null,
      };
    });
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
            <MarketTimeframeMenu
              value={interval}
              options={TIMEFRAMES}
              onChange={setInterval}
            />

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <MarketDrawingToolsMenu
                  activeDrawingTool={activeDrawingTool}
                  open={drawingToolsOpen}
                  onOpenChange={setDrawingToolsOpen}
                  onSelectTool={setActiveDrawingTool}
                />

                <div className="relative">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-expanded={drawingObjectsOpen}
                    aria-controls="market-chart-objects"
                    onClick={() =>
                      setDrawingObjectsOpen(
                        (open) => !open,
                      )
                    }
                  >
                    Objects
                  </Button>

                  {drawingObjectsOpen && (
                    <div
                      id="market-chart-objects"
                      className="absolute right-0 top-full z-50 mt-1"
                    >
                      <MarketDrawingObjectManager
                        state={drawingState}
                        onSelect={handleDrawingSelect}
                        onVisibilityChange={
                          handleDrawingVisibility
                        }
                        onLockChange={
                          handleDrawingLock
                        }
                        onDuplicate={
                          handleDrawingDuplicate
                        }
                        onDelete={handleDrawingDelete}
                        onBringForward={
                          handleDrawingBringForward
                        }
                        onSendBackward={
                          handleDrawingSendBackward
                        }
                        onBringToFront={
                          handleDrawingBringToFront
                        }
                        onSendToBack={
                          handleDrawingSendToBack
                        }
                        onShowAll={
                          handleShowAllDrawings
                        }
                        onHideAll={
                          handleHideAllDrawings
                        }
                        onDeleteAll={
                          handleDeleteAllDrawings
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

                <MarketChartWorkspaceControls
                  layout={chartLayout}
                  onLayoutChange={setChartLayout}
                  onResetWorkspace={
                    handleResetChartWorkspace
                  }
                />

                <MarketChartViewControls
                  volumeVisible={volumeVisible}
                  onFitContent={() =>
                    chartViewControlsRef.current?.fitContent()
                  }
                  onResetView={() =>
                    chartViewControlsRef.current?.resetView()
                  }
                  onZoomIn={() =>
                    chartViewControlsRef.current?.zoomIn()
                  }
                  onZoomOut={() =>
                    chartViewControlsRef.current?.zoomOut()
                  }
                  onAutoScale={() =>
                    chartViewControlsRef.current?.autoScale()
                  }
                  onToggleVolume={() =>
                    setVolumeVisible((visible) => !visible)
                  }
                />

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
                    drawingState={drawingState}
                    onDrawingStateChange={setDrawingState}
                    onRequestOlder={requestOlderCandles}
                  />
                  </div>

                  {chartLayout !== "CHART_ONLY" && visiblePaneIndicators.map((indicator) => (
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
