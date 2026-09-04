"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Expand,
  Minimize2,
  Search,
  Settings,
  Star,
  Camera,
  Box,
} from "lucide-react";
import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  Skeleton,
} from "@rmsm/ui";
import {
  useInstrument,
  useInstruments,
  useInstrumentsBatch,
  useCandles,
} from "@/features/market/hooks/use-market-data";
import { useMarketRealtime } from "@/features/market/hooks/use-market-realtime";
import {
  RMSMCandlestickChart,
  type RMSMCandlestickChartHandle,
} from "@/features/market/components/rmsm-candlestick-chart";
import { MarketIndicatorControls } from "@/features/market/components/market-indicator-controls";
import { MarketChartSettings } from "@/features/market/components/market-chart-settings";
import { MarketChartTemplateMenu } from "@/features/market/components/market-chart-template-menu";
import {
  MARKET_CHART_TOOLBAR_BUTTON_CLASS,
} from "@/features/market/components/market-chart-toolbar-styles";
import {
  DEFAULT_INDICATORS,
  type IndicatorConfig,
} from "@/features/market/indicators/config";
import {
  priceFormatFromTickSize,
  type Candle,
  type CandleInterval,
} from "@/features/market/types";
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
import { MarketTimeframeMenu } from "@/features/market/components/market-timeframe-menu";
import {
  MarketChartWorkspaceControls,
  type MarketChartLayout,
} from "@/features/market/components/market-chart-workspace-controls";
import { useWatchlistStore } from "@/features/watchlists/store";
import { useSessionStore } from "@/lib/session-store";
import {
  useTradingAccounts,
  useTradingOrders,
  useTradingPositions,
  useTradingTrades,
} from "@/features/trading/hooks/use-trading-accounts";
import { usePaperOrder } from "@/features/trading/hooks/use-paper-order";
import { useUpdateTradingPositionRisk } from "@/features/trading/hooks/use-update-trading-position-risk";
import { useCreateDemoTradingAccount } from "@/features/trading/hooks/use-create-demo-trading-account";
import { useTradingActions } from "@/features/trading/hooks/use-trading-actions";
import {
  TradingBottomDock,
  type TradingDockTab,
} from "@/features/trading/components/trading-bottom-dock";
import { TradingRightPanel } from "@/features/trading/components/trading-right-panel";
import { QuickTradingFloat } from "@/features/trading/components/quick-trading-float";
import { ChartWatchlist } from "@/features/watchlists/components/chart-watchlist";
import type { TradingMode } from "@/features/trading/components/trading-mode-switcher";
import type {
  TradingOrderType,
} from "@/features/trading/types";
import {
  useMarketWorkspaceStore,
} from "@/features/market/store";
import {
  cloneMarketChartSettings,
  DEFAULT_MARKET_CHART_SETTINGS,
  type MarketChartSettings as MarketChartSettingsValue,
} from "@/features/market/chart-settings";

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
  const router = useRouter();
  const instrumentId = params.instrumentId;

  const organizationId =
    useSessionStore((state) => state.organizationId) ??
    undefined;

  if (process.env.NODE_ENV !== "production") {
    console.debug("[Trading] organization context", {
      hasOrganizationId: Boolean(organizationId),
    });
  }

  const [tradingOpen, setTradingOpen] = useState(false);
  const [tradingAccountId, setTradingAccountId] = useState("");

  const quickTradingContainerRef =
    useRef<HTMLDivElement | null>(null);
  const [tradingMode, setTradingMode] =
    useState<TradingMode>("QUICK");
  const [tradingDockTab, setTradingDockTab] =
    useState<TradingDockTab>("accounts");
  const [paperOrderQuantity, setPaperOrderQuantity] =
    useState("1");

  const [orderType, setOrderType] =
    useState<TradingOrderType>("MARKET");

  const [orderQuantity, setOrderQuantity] =
    useState("1");

  const [orderLimitPrice, setOrderLimitPrice] =
    useState("");

  const [orderStopPrice, setOrderStopPrice] =
    useState("");

  const tradingAccountsQuery =
    useTradingAccounts(organizationId);

  const demoTradingAccounts = useMemo(
    () =>
      (tradingAccountsQuery.data ?? []).filter(
        (account) =>
          account.type === "DEMO" &&
          account.status === "ACTIVE",
      ),
    [tradingAccountsQuery.data],
  );

  useEffect(() => {
    if (
      tradingOpen &&
      !tradingAccountId &&
      demoTradingAccounts.length > 0
    ) {
      setTradingAccountId(
        demoTradingAccounts[0]!.id,
      );
    }
  }, [
    tradingOpen,
    tradingAccountId,
    demoTradingAccounts,
  ]);

  const selectedTradingAccount =
    demoTradingAccounts.find(
      (account) =>
        account.id === tradingAccountId,
    );

  const paperOrder = usePaperOrder(
    organizationId,
    tradingAccountId || undefined,
  );

  const tradingActions = useTradingActions(
    organizationId,
    tradingAccountId || undefined,
  );

  const updateTradingPositionRisk =
    useUpdateTradingPositionRisk(
      organizationId,
      tradingAccountId || undefined,
    );

  const tradingPositionsQuery = useTradingPositions(
    organizationId,
    tradingAccountId || undefined,
  );

  const tradingOrdersQuery = useTradingOrders(
    organizationId,
    tradingAccountId || undefined,
  );

  const tradingTradesQuery = useTradingTrades(
    organizationId,
    tradingAccountId || undefined,
  );

  const tradingInstrumentIds = useMemo(() => {
    const ids = new Set<string>();

    for (const position of tradingPositionsQuery.data ?? []) {
      ids.add(position.instrumentId);
    }

    for (const order of tradingOrdersQuery.data ?? []) {
      ids.add(order.instrumentId);
    }

    for (const trade of tradingTradesQuery.data ?? []) {
      ids.add(trade.instrumentId);
    }

    return [...ids].sort();
  }, [
    tradingPositionsQuery.data,
    tradingOrdersQuery.data,
    tradingTradesQuery.data,
  ]);

  const tradingInstrumentQuery =
    useInstrumentsBatch(tradingInstrumentIds);

  const tradingInstruments = useMemo(() => {
    const map: Record<
      string,
      {
        symbol: string;
        tickSize: string | null | undefined;
      }
    > = {};

    for (const instrument of tradingInstrumentQuery.data ?? []) {
      map[instrument.id] = {
        symbol: instrument.symbol,
        tickSize: instrument.tickSize,
      };
    }

    return map;
  }, [tradingInstrumentQuery.data]);

  const instrumentTradingPositions = useMemo(
    () =>
      (tradingPositionsQuery.data ?? []).filter(
        (position) =>
          position.instrumentId === instrumentId &&
          position.status === "OPEN",
      ),
    [tradingPositionsQuery.data, instrumentId],
  );

  const createDemoAccount =
    useCreateDemoTradingAccount(
      organizationId,
    );

  const favoriteInstrumentIds = useWatchlistStore(
    (state) => state.favoriteInstrumentIds,
  );

  const toggleFavorite = useWatchlistStore(
    (state) => state.toggleFavorite,
  );

  const isFavorite =
    instrumentId !== undefined &&
    favoriteInstrumentIds.includes(instrumentId);

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
  const [timezone, setTimezone] = useState<string>("Etc/UTC");

  const [chartSettings, setChartSettings] =
    useState<MarketChartSettingsValue>(() =>
      cloneMarketChartSettings(
        DEFAULT_MARKET_CHART_SETTINGS,
      ),
    );

  const [chartSettingsOpen, setChartSettingsOpen] =
    useState(false);

  const [templateMenuOpen, setTemplateMenuOpen] =
    useState(false);

  const chartSettingsRef =
    useRef<HTMLDivElement | null>(null);

  const templateMenuRef =
    useRef<HTMLDivElement | null>(null);

  const [symbolPickerOpen, setSymbolPickerOpen] =
    useState(false);
  const [symbolSearch, setSymbolSearch] =
    useState("");
  const symbolPickerRef = useRef<HTMLDivElement | null>(
    null,
  );
  const [debouncedSymbolSearch, setDebouncedSymbolSearch] =
    useState("");

  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingType>("SELECT");

  const [drawingObjectsOpen, setDrawingObjectsOpen] =
    useState(false);
  const drawingObjectsRef = useRef<HTMLDivElement | null>(
    null,
  );

  const [drawingState, setDrawingState] =
    useState<DrawingState>(() =>
      createDrawingState("SELECT"),
    );
  const chartViewControlsRef =
    useRef<RMSMCandlestickChartHandle | null>(null);

  const marketChartFullscreenRef =
    useRef<HTMLDivElement | null>(null);

  const [isMarketChartFullscreen, setIsMarketChartFullscreen] =
    useState(false);

  const [chartLayout, setChartLayout] =
    useState<MarketChartLayout>("SPLIT");



  const [indicators, setIndicators] =
    useState<IndicatorConfig[]>(DEFAULT_INDICATORS);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsMarketChartFullscreen(
        document.fullscreenElement ===
          marketChartFullscreenRef.current,
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange,
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange,
      );
    };
  }, []);

  const toggleMarketChartFullscreen = async () => {
    const element =
      marketChartFullscreenRef.current;

    if (!element) {
      return;
    }

    try {
      if (
        document.fullscreenElement === element
      ) {
        await document.exitFullscreen();
        return;
      }

      await element.requestFullscreen();
    } catch {
      // Browser fullscreen permission may be unavailable.
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSymbolSearch(symbolSearch.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [symbolSearch]);

  useEffect(() => {
    if (
      !symbolPickerOpen &&
      !drawingObjectsOpen &&
      !chartSettingsOpen &&
      !templateMenuOpen
    ) {
      return;
    }

    const handleDocumentPointerDown = (
      event: PointerEvent,
    ) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (
        symbolPickerOpen &&
        !symbolPickerRef.current?.contains(target)
      ) {
        setSymbolPickerOpen(false);
        setSymbolSearch("");
      }

      if (
        drawingObjectsOpen &&
        !drawingObjectsRef.current?.contains(target)
      ) {
        setDrawingObjectsOpen(false);
      }

      if (
        chartSettingsOpen &&
        !chartSettingsRef.current?.contains(target)
      ) {
        setChartSettingsOpen(false);
      }

      if (
        templateMenuOpen &&
        !templateMenuRef.current?.contains(target)
      ) {
        setTemplateMenuOpen(false);
      }
    };

    document.addEventListener(
      "pointerdown",
      handleDocumentPointerDown,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
      );
    };
  }, [
    symbolPickerOpen,
    drawingObjectsOpen,
    chartSettingsOpen,
    templateMenuOpen,
  ]);

  useEffect(() => {
    if (!instrumentId) {
      return;
    }

    if (workspaceHydratedForInstrument === instrumentId) {
      return;
    }

    if (persistedWorkspace) {
      setInterval(persistedWorkspace.interval);
      setTimezone(persistedWorkspace.timezone === "UTC"
        ? "Etc/UTC"
        : (persistedWorkspace.timezone ?? "Etc/UTC"));
      setActiveDrawingTool(
        persistedWorkspace.activeDrawingTool,
      );
      setChartLayout(
        persistedWorkspace.chartLayout,
      );

      setChartSettings(
        cloneMarketChartSettings(
          persistedWorkspace.chartSettings ??
            DEFAULT_MARKET_CHART_SETTINGS,
        ),
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
      setTimezone("Etc/UTC");
      setActiveDrawingTool("SELECT");
      setChartLayout("SPLIT");

      setChartSettings(
        cloneMarketChartSettings(
          DEFAULT_MARKET_CHART_SETTINGS,
        ),
      );

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
      timezone,
      activeDrawingTool,
      chartLayout,
      chartSettings:
        cloneMarketChartSettings(chartSettings),
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
    timezone,
    activeDrawingTool,
    chartLayout,
    chartSettings,
    indicators,
    drawingState,
    setPersistedWorkspace,
  ]);

  const instrumentQuery = useInstrument(instrumentId);

  const {
    precision: pricePrecision,
    minMove: priceMinMove,
  } = priceFormatFromTickSize(
    instrumentQuery.data?.tickSize,
  );

  const symbolSearchQuery = useInstruments({
    query: debouncedSymbolSearch || undefined,
    page: 1,
    pageSize: 50,
    enabled: symbolPickerOpen,
  });

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

  const {
    liveCandle,
    liveQuote,
    liveDepth,
    liveQuotes,
  } = useMarketRealtime(
    instrumentId,
    interval,
    tradingInstrumentIds,
  );

  const tradingCurrentPrices = useMemo(
    () => {
      const prices: Record<string, number> = {};

      for (const position of tradingPositionsQuery.data ?? []) {
        const quote = liveQuotes[position.instrumentId];

        if (!quote) {
          continue;
        }

        const rawPrice =
          position.side === "SHORT"
            ? quote.askPrice
            : quote.bidPrice;

        if (rawPrice == null) {
          continue;
        }

        const price = Number(rawPrice);

        if (Number.isFinite(price)) {
          prices[position.instrumentId] = price;
        }
      }

      return prices;
    },
    [
      tradingPositionsQuery.data,
      liveQuotes,
    ],
  );


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


  const recordRecentlyViewed = useWatchlistStore(
    (s) => s.recordRecentlyViewed,
  );

  const handleResetChartWorkspace = () => {
    setChartLayout("SPLIT");

    setChartSettings(
      cloneMarketChartSettings(
        DEFAULT_MARKET_CHART_SETTINGS,
      ),
    );

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

  const currentInstrumentPosition =
    (tradingPositionsQuery.data ?? []).find(
      (position) =>
        position.instrumentId === instrument.id &&
        position.status === "OPEN",
    );

  async function handleCreateDemoAccount(input: {
    name: string;
    currency: string;
    startingBalance: number;
  }) {
    const account =
      await createDemoAccount.mutateAsync(input);

    setTradingAccountId(account.id);
  }

  async function handlePaperOrder(
    side: "BUY" | "SELL",
  ) {
    if (!tradingAccountId) return;

    const quantity =
      paperOrderQuantity.trim();

    if (!quantity) return;

    await paperOrder.mutateAsync({
      instrumentId,
      side,
      quantity,
      type: orderType,
    });
  }


  async function handleClosePosition() {
    const position = currentInstrumentPosition;

    if (!position) {
      return;
    }

    await tradingActions.closePosition.mutateAsync(
      position.id,
    );
  }

  async function handleReversePosition() {
    const position = currentInstrumentPosition;

    if (!position) {
      return;
    }

    await tradingActions.reversePosition.mutateAsync(
      position.id,
    );
  }

  async function handleCancelAllOrders() {
    await tradingActions.cancelAllOrders.mutateAsync();
  }

  async function handleFlattenAllPositions() {
    await tradingActions.flattenAllPositions.mutateAsync();
  }

  async function handleOrderSubmit(
    side: "BUY" | "SELL",
  ) {
    const quantity = orderQuantity.trim();

    if (!tradingAccountId || !quantity) {
      return;
    }

    const limitPrice =
      orderLimitPrice.trim();

    const stopPrice =
      orderStopPrice.trim();

    if (
      (
        orderType === "LIMIT" ||
        orderType === "STOP_LIMIT"
      ) &&
      !limitPrice
    ) {
      return;
    }

    if (
      (
        orderType === "STOP" ||
        orderType === "STOP_LIMIT"
      ) &&
      !stopPrice
    ) {
      return;
    }

    await paperOrder.mutateAsync({
      instrumentId,
      side,
      quantity,
      type: orderType,
      ...(limitPrice &&
      (
        orderType === "LIMIT" ||
        orderType === "STOP_LIMIT"
      )
        ? { limitPrice }
        : {}),
      ...(stopPrice &&
      (
        orderType === "STOP" ||
        orderType === "STOP_LIMIT"
      )
        ? { stopPrice }
        : {}),
    });

    setOrderQuantity("1");
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Card
        ref={marketChartFullscreenRef}
        className="min-h-0 flex-1"
      >
        <CardContent className="flex h-full min-h-0 flex-col p-0">
          <div className="relative z-30 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-2 pb-2 pointer-events-auto">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleFavorite(instrument.id)}
                  aria-label={
                    isFavorite
                      ? `Remove ${instrument.symbol} from favorites`
                      : `Add ${instrument.symbol} to favorites`
                  }
                  aria-pressed={isFavorite}
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Star
                    className={
                      isFavorite
                        ? "h-4 w-4 fill-yellow-400 text-yellow-400"
                        : "h-4 w-4"
                    }
                    aria-hidden="true"
                  />
                </button>

                <div className="relative">
                  <button
                    type="button"
                    className="inline-flex h-8 min-w-[120px] items-center gap-1 rounded-md px-2 text-sm font-semibold transition-colors hover:bg-muted"
                    aria-expanded={symbolPickerOpen}
                    aria-haspopup="listbox"
                    onClick={() => {
                      setSymbolPickerOpen(
                        (open) => !open,
                      );
                      setSymbolSearch("");
                    }}
                  >
                    <span
                      className="truncate"
                      title={instrument.symbol}
                    >
                      {instrument.symbol}
                    </span>

                    <span
                      className="text-xs text-muted-foreground"
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>

                  {symbolPickerOpen && (
                    <div
                      ref={symbolPickerRef}
                      className="absolute left-0 top-full z-[80] mt-1 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-xl"
                      role="dialog"
                      aria-label="Symbol search"
                    >
                      <div className="border-b p-2">
                        <div className="relative">
                          <Search
                            className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />

                          <input
                            autoFocus
                            value={symbolSearch}
                            onChange={(event) =>
                              setSymbolSearch(
                                event.target.value,
                              )
                            }
                            placeholder="Search symbol or name..."
                            aria-label="Search symbol or name"
                            className="h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </div>
                      </div>

                      <div className="max-h-72 overflow-y-auto p-1">
                        {symbolSearchQuery.isLoading && (
                          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                            Searching...
                          </div>
                        )}

                        {!symbolSearchQuery.isLoading &&
                          symbolSearchQuery.data?.data.length ===
                            0 && (
                            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                              No instruments found.
                            </div>
                          )}

                        {symbolSearchQuery.data?.data.map(
                          (candidate) => (
                            <button
                              key={candidate.id}
                              type="button"
                              className="flex w-full items-center justify-between rounded-sm px-3 py-2 text-left hover:bg-muted"
                              onClick={() => {
                                setSymbolPickerOpen(false);
                                setSymbolSearch("");

                                if (
                                  candidate.id !==
                                  instrument.id
                                ) {
                                  router.push(
                                    `/market/${candidate.id}`,
                                  );
                                }
                              }}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {candidate.symbol}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {candidate.name}
                                </span>
                              </span>

                              <span className="ml-3 shrink-0 text-[10px] uppercase text-muted-foreground">
                                {candidate.assetClass}
                              </span>
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <MarketTimeframeMenu
                value={interval}
                options={TIMEFRAMES}
                onChange={setInterval}
              />

              {selectedTradingAccount && (
                <QuickTradingFloat
                  account={selectedTradingAccount}
                  symbol={instrument.symbol}
                  bidPrice={liveQuote?.bidPrice}
                  askPrice={liveQuote?.askPrice}
                  quantity={paperOrderQuantity}
                  onQuantityChange={setPaperOrderQuantity}
                  onSubmit={(side) => {
                    void handlePaperOrder(side);
                  }}
                  isPending={paperOrder.isPending}
                  errorMessage={
                    paperOrder.isError
                      ? paperOrder.error instanceof Error
                        ? paperOrder.error.message
                        : "Unable to execute paper order."
                      : null
                  }
                />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={tradingOpen ? "default" : "ghost"}
                  className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
                  data-active={tradingOpen}
                  aria-pressed={tradingOpen}
                  onClick={() => {
                    setTradingOpen((open) => {
                      const nextOpen = !open;

                      if (nextOpen) {
                        setTradingMode("DOM");
                      }

                      return nextOpen;
                    });
                  }}
                >
                  Trade
                </Button>

                <div
                  ref={drawingObjectsRef}
                  className="relative"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
                    data-active={drawingObjectsOpen}
                    aria-expanded={drawingObjectsOpen}
                    aria-controls="market-chart-objects"
                    aria-label="Objects"
                    title="Objects"
                    onClick={() =>
                      setDrawingObjectsOpen(
                        (open) => !open,
                      )
                    }
                  >
                    <Box
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    <span className="sr-only">Objects</span>
                  </Button>

                  {drawingObjectsOpen && (
                    <div
                      id="market-chart-objects"
                      className="absolute left-0 top-full z-50 mt-1 max-w-[calc(100vw-1rem)]"
                    >
                        <MarketDrawingObjectManager
                        state={drawingState}
                        onClose={() =>
                          setDrawingObjectsOpen(false)
                        }
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

              <MarketChartTemplateMenu
                indicators={indicators}
                chartSettings={chartSettings}
                open={templateMenuOpen}
                onOpenChange={setTemplateMenuOpen}
                containerRef={templateMenuRef}
              />

              <div
                ref={chartSettingsRef}
                className="relative"
              >
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={MARKET_CHART_TOOLBAR_BUTTON_CLASS}
                  data-active={chartSettingsOpen}
                  aria-expanded={chartSettingsOpen}
                  aria-controls="market-chart-settings"
                  aria-label="Chart Settings"
                  title="Chart Settings"
                  onClick={() =>
                    setChartSettingsOpen(
                      (open) => !open,
                    )
                  }
                >
                  <Settings
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Chart Settings</span>
                </Button>

                {chartSettingsOpen && (
                  <div
                    id="market-chart-settings"
                    className="absolute right-0 top-full z-[90] mt-1"
                  >
                    <MarketChartSettings
                      value={chartSettings}
                      onChange={setChartSettings}
                      onReset={() =>
                        setChartSettings(
                          cloneMarketChartSettings(
                            DEFAULT_MARKET_CHART_SETTINGS,
                          ),
                        )
                      }
                    />
                  </div>
                )}
              </div>

                <Button
                type="button"
                size="sm"
                variant="ghost"
                className={
                  MARKET_CHART_TOOLBAR_BUTTON_CLASS
                }
                onClick={
                  toggleMarketChartFullscreen
                }
                aria-label={
                  isMarketChartFullscreen
                    ? "Exit fullscreen"
                    : "Fullscreen"
                }
                title={
                  isMarketChartFullscreen
                    ? "Exit fullscreen"
                    : "Fullscreen"
                }
              >
                {isMarketChartFullscreen ? (
                  <Minimize2
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                ) : (
                  <Expand
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                )}
                <span className="sr-only">
                  {isMarketChartFullscreen
                    ? "Exit Fullscreen"
                    : "Fullscreen"}
                </span>
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={
                  MARKET_CHART_TOOLBAR_BUTTON_CLASS
                }
                onClick={() =>
                  chartViewControlsRef.current?.takeSnapshot()
                }
                aria-label="Take chart snapshot"
                title="Take chart snapshot"
              >
                <Camera
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                <span className="sr-only">Snapshot</span>
              </Button>

              <MarketChartWorkspaceControls
                  layout={chartLayout}
                  onLayoutChange={setChartLayout}
                  onResetWorkspace={
                    handleResetChartWorkspace
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

          <div className="relative z-0 flex min-h-0 flex-1 flex-col pt-0">
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
              <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                {/* LEFT COLUMN: chart + bottom trading dock */}
                <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <div
                    ref={quickTradingContainerRef}
                    className="relative flex min-h-0 min-w-0 flex-1"
                  >
                    <div className="relative h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                      <RMSMCandlestickChart
                        ref={chartViewControlsRef}
                        candles={displayCandles}
                        liveCandle={liveCandle}
                        positions={instrumentTradingPositions}
                        orders={(tradingOrdersQuery.data ?? []).filter(
                          (order) =>
                            order.instrumentId === instrumentId &&
                            order.status === "PENDING",
                        )}
                        currentPrice={
                          liveQuote?.bidPrice != null &&
                          liveQuote?.askPrice != null
                            ? (
                                Number(liveQuote.bidPrice) +
                                Number(liveQuote.askPrice)
                              ) / 2
                            : liveQuote?.bidPrice != null
                              ? Number(liveQuote.bidPrice)
                              : liveQuote?.askPrice != null
                                ? Number(liveQuote.askPrice)
                                : null
                        }
                        onPositionRiskChange={(
                          positionId,
                          risk,
                        ) => {
                          updateTradingPositionRisk.mutate({
                            positionId,
                            stopLossPrice:
                              risk.stopLossPrice,
                            takeProfitPrice:
                              risk.takeProfitPrice,
                          });
                        }}
                        onPositionClose={(positionId) => {
                          void tradingActions.closePosition.mutateAsync(
                            positionId,
                          );
                        }}
                        onPendingOrderCancel={(orderId) => {
                          void tradingActions.cancelOrder.mutateAsync(
                            orderId,
                          );
                        }}
                        onPendingOrderPriceChange={(
                          orderId,
                          price,
                        ) => {
                          void tradingActions.updatePendingOrder.mutateAsync({
                            orderId,
                            price: price.toFixed(
                              pricePrecision,
                            ),
                          });
                        }}
                        onChartLimitOrder={(
                          type,
                          side,
                          price,
                          quantity,
                        ) => {
                          if (!tradingAccountId) {
                            return;
                          }

                          void paperOrder.mutateAsync({
                            instrumentId,
                            side,
                            quantity,
                            type,
                            ...(type === "LIMIT"
                              ? {
                                  limitPrice:
                                    price.toFixed(
                                      pricePrecision,
                                    ),
                                }
                              : {
                                  stopPrice:
                                    price.toFixed(
                                      pricePrecision,
                                    ),
                                }),
                          });
                        }}
                        onChartSettingsOpen={() => {
                          setChartSettingsOpen(true);
                        }}
                        interval={interval}
                        timezone={timezone}
                        pricePrecision={pricePrecision}
                        priceMinMove={priceMinMove}
                        indicators={indicators}
                        chartSettings={chartSettings}
                        activeDrawingTool={activeDrawingTool}
                        drawingState={drawingState}
                        onDrawingStateChange={setDrawingState}
                        onRequestOlder={requestOlderCandles}
                      />
                    </div>

                  </div>

                  {tradingOpen && (
                    <div className="shrink-0 min-w-0 max-w-full px-2 pb-2 pt-2">
                      <TradingBottomDock
                        accounts={demoTradingAccounts}
                        account={selectedTradingAccount}
                        accountId={tradingAccountId}
                        orders={(tradingOrdersQuery.data ?? []).filter(
                          (order) =>
                            order.instrumentId === instrumentId &&
                            order.status === "PENDING",
                        )}
                        positions={tradingPositionsQuery.data ?? []}
                        trades={tradingTradesQuery.data ?? []}
                        currentPrices={tradingCurrentPrices}
                        instruments={tradingInstruments}
                        onAccountChange={(value) => {
                          setTradingAccountId(value);
                          paperOrder.reset();
                        }}
                        activeTab={tradingDockTab}
                        onTabChange={setTradingDockTab}
                        isLoading={tradingAccountsQuery.isLoading}
                        disabled={tradingAccountsQuery.isError}
                        onCancelAllOrders={() => {
                          void handleCancelAllOrders();
                        }}
                        onCancelOrder={(orderId) => {
                          void tradingActions.cancelOrder.mutateAsync(
                            orderId,
                          );
                        }}
                        onClosePosition={(positionId) => {
                          void tradingActions.closePosition.mutateAsync(
                            positionId,
                          );
                        }}
                        isTradingActionPending={
                          tradingActions.isPending
                        }
                      />
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Order / DOM + Watchlist */}
                <div
                  className={
                    tradingOpen
                      ? "flex h-full min-h-0 w-[360px] min-w-0 shrink-0 flex-col overflow-hidden max-md:hidden"
                      : "hidden"
                  }
                >
                  {tradingOpen && tradingMode !== "QUICK" && (
                    <div className="min-h-0 shrink-0">
                        <TradingRightPanel
                          mode={tradingMode}
                          onModeChange={setTradingMode}
                          account={selectedTradingAccount}
                          symbol={instrument.symbol}
                          bidPrice={liveQuote?.bidPrice}
                          askPrice={liveQuote?.askPrice}
                          depth={liveDepth}
                          quantity={paperOrderQuantity}
                          onQuantityChange={setPaperOrderQuantity}
                          onSubmit={(side) => {
                            void handlePaperOrder(side);
                          }}
                          currentPosition={currentInstrumentPosition}
                          onClosePosition={() => {
                            void handleClosePosition();
                          }}
                          onReversePosition={() => {
                            void handleReversePosition();
                          }}
                          onCancelAllOrders={() => {
                            void handleCancelAllOrders();
                          }}
                          onFlattenAllPositions={() => {
                            void handleFlattenAllPositions();
                          }}
                          isTradingActionPending={
                            tradingActions.isPending
                          }
                          orderType={orderType}
                          onOrderTypeChange={setOrderType}
                          orderQuantity={orderQuantity}
                          onOrderQuantityChange={
                            setOrderQuantity
                          }
                          orderLimitPrice={orderLimitPrice}
                          onOrderLimitPriceChange={
                            setOrderLimitPrice
                          }
                          orderStopPrice={orderStopPrice}
                          onOrderStopPriceChange={
                            setOrderStopPrice
                          }
                          onOrderSubmit={(side) => {
                            void handleOrderSubmit(side);
                          }}
                          onCreateDemoAccount={
                            handleCreateDemoAccount
                          }
                          isCreatingDemoAccount={
                            createDemoAccount.isPending
                          }
                          createDemoAccountError={
                            createDemoAccount.isError
                              ? createDemoAccount.error instanceof
                                Error
                                ? createDemoAccount.error.message
                                : "Unable to create Demo account."
                              : null
                          }
                          isPending={paperOrder.isPending}
                          errorMessage={
                            paperOrder.isError
                              ? paperOrder.error instanceof Error
                                ? paperOrder.error.message
                                : "Unable to execute paper order."
                              : null
                          }
                        />
                      </div>
                    )}

                  <ChartWatchlist
                    currentInstrumentId={instrumentId}
                  />
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
