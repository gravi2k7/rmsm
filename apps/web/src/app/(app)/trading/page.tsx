"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import {
  BarChart3,
  Box,
  Camera,
  ChevronDown,
  Circle,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  Redo2,
  Search,
  Settings,
  Settings2,
  Sun,
  Wallet,
  Undo2,
  User as UserIcon,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@rmsm/ui";

import { useThemeStore } from "@/lib/theme-store";
import { useAuthStore } from "@/lib/auth-store";
import { useLogout } from "@/hooks/use-auth";
import { NotificationCenter } from "@/components/dashboard/header";
import { useSessionStore } from "@/lib/session-store";
import { useUiStore } from "@/store/use-ui-store";
import { useWatchlistStore } from "@/features/watchlists/store";
import {
  useTradingAccounts,
  useTradingOrders,
  useTradingPositions,
  useTradingTrades,
} from "@/features/trading/hooks/use-trading-accounts";
import { useCandles, useInstrument, useInstruments, useInstrumentsBatch } from "@/features/market/hooks/use-market-data";
import { useMarketRealtime } from "@/features/market/hooks/use-market-realtime";
import { usePaperOrder } from "@/features/trading/hooks/use-paper-order";
import { useTradingActions } from "@/features/trading/hooks/use-trading-actions";
import { useUpdateTradingPositionRisk } from "@/features/trading/hooks/use-update-trading-position-risk";
import type { TradingAccount, TradingOrderSide, TradingOrderType } from "@/features/trading/types";
import type { Candle, CandleInterval } from "@/features/market/types";
import {
  RMSMCandlestickChart,
  type RMSMCandlestickChartHandle,
} from "@/features/market/components/rmsm-candlestick-chart";
import {
  TradingBottomDock,
  type TradingDockTab,
} from "@/features/trading/components/trading-bottom-dock";
import { TradingRightPanel } from "@/features/trading/components/trading-right-panel";
import {
  TradingMobileShell,
  type TradingMobileTab,
} from "@/features/trading/components/mobile/trading-mobile-shell";
import type { MarketChartSettings } from "@/features/market/chart-settings";
import { DEFAULT_MARKET_CHART_SETTINGS } from "@/features/market/chart-settings";
import type { DrawingState } from "@/features/market/drawings/types";
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
import {
  commitHistory,
  createHistory,
  redo,
  undo,
  type DrawingHistory,
} from "@/features/market/drawings/history";
import { DEFAULT_INDICATORS, type IndicatorConfig } from "@/features/market/indicators/config";
import { MarketIndicatorControls } from "@/features/market/components/market-indicator-controls";
import { MarketDrawingObjectManager } from "@/features/market/components/market-drawing-object-manager";
import { MarketChartSettings as MarketChartSettingsPanel } from "@/features/market/components/market-chart-settings";
import { MarketChartTemplateMenu } from "@/features/market/components/market-chart-template-menu";
import { cloneMarketChartTemplate } from "@/features/market/chart-template";

const DEFAULT_INSTRUMENT_ID = "56bebcda-8b8c-4471-aea4-38afa4150036";

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

function money(value: string | number | null | undefined, currency = "USD") {
  if (value == null) return "—";

  const number = Number(value);
  if (!Number.isFinite(number)) return "—";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(number);
}

export default function TradingPage() {
  const [tradingMobileTab, setTradingMobileTab] = useState<TradingMobileTab>("chart");
  const [mobileOrdersView, setMobileOrdersView] = useState<"positions" | "orders">("positions");

  const [mobileMarketSearch, setMobileMarketSearch] = useState("");
  const [mobileMarketAssetClass, setMobileMarketAssetClass] = useState("ALL");

  const organizationId = useSessionStore((state) => state.organizationId) ?? undefined;

  const accountsQuery = useTradingAccounts(organizationId);

  const demoAccounts = useMemo(
    () =>
      (accountsQuery.data ?? []).filter(
        (account) => account.type === "DEMO" && account.status === "ACTIVE",
      ),
    [accountsQuery.data],
  );

  const searchParams = useSearchParams();

  const [accountId, setAccountId] = useState("");
  const [instrumentId, setInstrumentId] = useState(() => {
    const requestedInstrumentId = searchParams.get("instrument");

    return requestedInstrumentId || DEFAULT_INSTRUMENT_ID;
  });
  const [instrumentSearchQuery, setInstrumentSearchQuery] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const chartWorkspaceRef = useRef<HTMLDivElement>(null);

  const toggleChartFullscreen = async () => {
    const element = chartWorkspaceRef.current;

    if (!element) {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await element.requestFullscreen();
    }
  };

  const handleGoToChartTime = () => {
    if (!goToDateTime) {
      return;
    }

    const time = new Date(goToDateTime).getTime() / 1000;

    if (!Number.isFinite(time)) {
      return;
    }

    chartViewControlsRef.current?.goToTime(time);
    setGoToOpen(false);
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === chartWorkspaceRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const router = useRouter();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();

  async function handleLogout() {
    await logout.mutateAsync();
    router.push("/login");
  }

  const [interval, setInterval] = useState<CandleInterval>("ONE_MINUTE");

  const [quantity, setQuantity] = useState("10");
  const [orderType, setOrderType] = useState<TradingOrderType>("MARKET");
  const [orderQuantity, setOrderQuantity] = useState("10");
  const [orderLimitPrice, setOrderLimitPrice] = useState("");
  const [orderStopPrice, setOrderStopPrice] = useState("");
  const [mobileTakeProfitEnabled, setMobileTakeProfitEnabled] = useState(false);
  const [mobileStopLossEnabled, setMobileStopLossEnabled] = useState(false);
  const [mobileTakeProfitPrice, setMobileTakeProfitPrice] = useState("");
  const [mobileStopLossPrice, setMobileStopLossPrice] = useState("");

  const [tradingDockTab, setTradingDockTab] = useState<TradingDockTab>("positions");

  const [tradingMode, setTradingMode] = useState<"QUICK" | "ORDER" | "DOM">("DOM");

  const [chartSettings, setChartSettings] = useState<MarketChartSettings>(
    DEFAULT_MARKET_CHART_SETTINGS,
  );

  const [indicators, setIndicators] = useState<IndicatorConfig[]>(DEFAULT_INDICATORS);

  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);

  const [drawingObjectsOpen, setDrawingObjectsOpen] = useState(false);

  const [templatesOpen, setTemplatesOpen] = useState(false);

  const [goToOpen, setGoToOpen] = useState(false);

  const [goToDateTime, setGoToDateTime] = useState("");

  const templatesRef = useRef<HTMLDivElement | null>(null);

  const drawingObjectsRef = useRef<HTMLDivElement | null>(null);

  const chartSettingsRef = useRef<HTMLDivElement | null>(null);

  const [initialDrawingState] = useState<DrawingState>(() => createDrawingState());

  const [drawingState, setDrawingState] = useState<DrawingState>(initialDrawingState);

  const [drawingHistory, setDrawingHistory] = useState<DrawingHistory>(() =>
    createHistory(initialDrawingState),
  );

  const handleDrawingStateChange = (nextState: DrawingState) => {
    setDrawingState((currentState) => {
      if (nextState.drawings !== currentState.drawings) {
        setDrawingHistory((history) => commitHistory(history, nextState));
      }

      return nextState;
    });
  };

  const handleDrawingSelect = (id: string | null) => {
    setDrawingState((state) => selectDrawing(state, id));
  };

  const handleDrawingVisibility = (id: string, visible: boolean) => {
    setDrawingState((state) => setDrawingVisibility(state, id, visible));
  };

  const handleDrawingLock = (id: string, locked: boolean) => {
    setDrawingState((state) => setDrawingLocked(state, id, locked));
  };

  const handleDrawingDuplicate = (id: string) => {
    setDrawingState((state) => duplicateDrawing(state, id));
  };

  const handleDrawingDelete = (id: string) => {
    setDrawingState((state) => removeDrawing(state, id));
  };

  const handleDrawingBringForward = (id: string) => {
    setDrawingState((state) => bringDrawingForward(state, id));
  };

  const handleDrawingSendBackward = (id: string) => {
    setDrawingState((state) => sendDrawingBackward(state, id));
  };

  const handleDrawingBringToFront = (id: string) => {
    setDrawingState((state) => bringDrawingToFront(state, id));
  };

  const handleDrawingSendToBack = (id: string) => {
    setDrawingState((state) => sendDrawingToBack(state, id));
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
      const drawings = state.drawings.filter((drawing) => drawing.locked);

      return {
        ...state,
        drawings,
        selectedDrawingId:
          state.selectedDrawingId &&
          drawings.some((drawing) => drawing.id === state.selectedDrawingId)
            ? state.selectedDrawingId
            : null,
      };
    });
  };

  const handleUndoDrawing = () => {
    setDrawingHistory((currentHistory) => {
      const nextHistory = undo(currentHistory);

      if (nextHistory !== currentHistory) {
        setDrawingState(nextHistory.present);
      }

      return nextHistory;
    });
  };

  const handleRedoDrawing = () => {
    setDrawingHistory((currentHistory) => {
      const nextHistory = redo(currentHistory);

      if (nextHistory !== currentHistory) {
        setDrawingState(nextHistory.present);
      }

      return nextHistory;
    });
  };

  const chartViewControlsRef = useRef<RMSMCandlestickChartHandle>(null);

  const mobileChartViewControlsRef = useRef<RMSMCandlestickChartHandle>(null);

  const toggleIndicator = (id: string) => {
    setIndicators((current) =>
      current.map((indicator) =>
        indicator.id === id ? { ...indicator, visible: !indicator.visible } : indicator,
      ),
    );
  };

  const updateIndicator = (id: string, patch: Partial<IndicatorConfig>) => {
    setIndicators((current) =>
      current.map((indicator) => (indicator.id === id ? { ...indicator, ...patch } : indicator)),
    );
  };

  useEffect(() => {
    if (accountId && demoAccounts.some((account) => account.id === accountId)) {
      return;
    }

    if (demoAccounts.length > 0) {
      setAccountId(demoAccounts[0]!.id);
    }
  }, [accountId, demoAccounts]);

  const selectedAccount: TradingAccount | undefined = demoAccounts.find(
    (account) => account.id === accountId,
  );

  const instrumentsQuery = useInstruments({
    status: "ACTIVE",
    page: 1,
    pageSize: 100,
  });

  const normalizedInstrumentSearchQuery = instrumentSearchQuery.trim().toLowerCase();

  const filteredInstruments = useMemo(
    () =>
      (instrumentsQuery.data?.data ?? []).filter((item) => {
        if (!normalizedInstrumentSearchQuery) {
          return true;
        }

        return (
          item.symbol.toLowerCase().includes(normalizedInstrumentSearchQuery) ||
          item.name.toLowerCase().includes(normalizedInstrumentSearchQuery)
        );
      }),
    [instrumentsQuery.data?.data, normalizedInstrumentSearchQuery],
  );

  const mobileMarketAssetClasses = useMemo(() => {
    const classes = new Set(filteredInstruments.map((item) => item.assetClass).filter(Boolean));

    return ["ALL", ...Array.from(classes)];
  }, [filteredInstruments]);

  const mobileMarketInstruments = useMemo(() => {
    const query = mobileMarketSearch.trim().toLowerCase();

    return filteredInstruments.filter((item) => {
      const matchesClass =
        mobileMarketAssetClass === "ALL" || item.assetClass === mobileMarketAssetClass;

      const symbol = typeof item.symbol === "string" ? item.symbol.toLowerCase() : "";

      const name = typeof item.name === "string" ? item.name.toLowerCase() : "";

      const matchesSearch = !query || symbol.includes(query) || name.includes(query);

      return matchesClass && matchesSearch;
    });
  }, [filteredInstruments, mobileMarketSearch, mobileMarketAssetClass]);

  // Mobile Markets uses the existing realtime WebSocket subscription.
  // Keep this array memoized so normal React renders do not recreate
  // the realtime client.
  const mobileMarketQuoteInstrumentIds = useMemo(
    () => (tradingMobileTab === "markets" ? mobileMarketInstruments.map((item) => item.id) : []),
    [tradingMobileTab, mobileMarketInstruments],
  );

  const instrumentQuery = useInstrument(instrumentId);

  const selectedTimeframe = useMemo(
    () => TIMEFRAMES.find((timeframe) => timeframe.value === interval) ?? TIMEFRAMES[0]!,
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
      limit: olderCursor ? HISTORICAL_PAGE_SIZE : selectedTimeframe.initialLimit,
      before: olderCursor,
    };
  }, [instrumentId, interval, selectedTimeframe, olderCursor]);

  const candlesQuery = useCandles(candleParams);

  const positionsQuery = useTradingPositions(organizationId, accountId || undefined);

  const ordersQuery = useTradingOrders(organizationId, accountId || undefined);

  const tradesQuery = useTradingTrades(organizationId, accountId || undefined);

  const tradingInstrumentIdKey = useMemo(() => {
    const ids = new Set<string>();

    for (const position of positionsQuery.data ?? []) {
      ids.add(position.instrumentId);
    }

    for (const order of ordersQuery.data ?? []) {
      ids.add(order.instrumentId);
    }

    for (const trade of tradesQuery.data ?? []) {
      ids.add(trade.instrumentId);
    }

    return [...ids].sort().join("|");
  }, [
    positionsQuery.data,
    ordersQuery.data,
    tradesQuery.data,
  ]);

  const realtimeTradingInstrumentIds = useMemo(
    () =>
      tradingInstrumentIdKey
        ? tradingInstrumentIdKey.split("|")
        : [],
    [tradingInstrumentIdKey],
  );

  const tradingInstrumentIds = useMemo(
    () =>
      [
        instrumentId,
        ...(positionsQuery.data ?? []).map((position) => position.instrumentId),
        ...(ordersQuery.data ?? []).map((order) => order.instrumentId),
        ...(tradesQuery.data ?? []).map((trade) => trade.instrumentId),
      ].filter((id): id is string => Boolean(id)),
    [instrumentId, positionsQuery.data, ordersQuery.data, tradesQuery.data],
  );

  const tradingInstrumentsQuery = useInstrumentsBatch(tradingInstrumentIds);

  const tradingInstruments = useMemo(() => {
    const map: Record<
      string,
      {
        symbol: string;
        tickSize: string | null | undefined;
        lotSize: string | null | undefined;
        currency: string;
      }
    > = {};

    for (const tradingInstrument of tradingInstrumentsQuery.data ?? []) {
      map[tradingInstrument.id] = {
        symbol: tradingInstrument.symbol,
        tickSize: tradingInstrument.tickSize,
        lotSize: tradingInstrument.lotSize,
        currency: tradingInstrument.currency,
      };
    }

    return map;
  }, [tradingInstrumentsQuery.data]);

  // Load the complete active FX universe so P&L conversion is
  // data-driven rather than tied to hard-coded instrument IDs.
  const fxInstrumentsQuery = useInstruments({
    assetClass: "FOREX",
    status: "ACTIVE",
    page: 1,
    pageSize: 100,
  });

  const fxConversionByCurrency = useMemo(() => {
    const map: Record<
      string,
      { instrumentId: string; inverse: boolean }
    > = {};

    for (const fxInstrument of fxInstrumentsQuery.data?.data ?? []) {
      const symbol = fxInstrument.symbol.replace("/", "").toUpperCase();

      if (symbol.length !== 6) {
        continue;
      }

      const baseCurrency = symbol.slice(0, 3);
      const quoteCurrency = symbol.slice(3);

      if (quoteCurrency === "USD" && baseCurrency !== "USD") {
        map[baseCurrency] = {
          instrumentId: fxInstrument.id,
          inverse: false,
        };
      }

      if (baseCurrency === "USD" && quoteCurrency !== "USD") {
        map[quoteCurrency] = {
          instrumentId: fxInstrument.id,
          inverse: true,
        };
      }
    }

    return map;
  }, [fxInstrumentsQuery.data?.data]);

  const pnlConversionInstrumentIds = useMemo(() => {
    const ids = new Set<string>();

    for (const position of positionsQuery.data ?? []) {
      const positionInstrument = tradingInstruments[position.instrumentId];

      if (!positionInstrument) {
        continue;
      }

      const quoteCurrency = positionInstrument.currency.toUpperCase();

      if (quoteCurrency === "USD") {
        continue;
      }

      const conversion = fxConversionByCurrency[quoteCurrency];

      if (conversion) {
        ids.add(conversion.instrumentId);
      }
    }

    return [...ids];
  }, [
    positionsQuery.data,
    tradingInstruments,
    fxConversionByCurrency,
  ]);

  const realtimeQuoteInstrumentIds = useMemo(
    () => [
      ...new Set([
        ...realtimeTradingInstrumentIds,
        ...mobileMarketQuoteInstrumentIds,
        ...pnlConversionInstrumentIds,
      ]),
    ],
    [
      realtimeTradingInstrumentIds,
      mobileMarketQuoteInstrumentIds,
      pnlConversionInstrumentIds,
    ],
  );

  const { liveCandle, liveQuote, liveDepth, liveQuotes } = useMarketRealtime(
    instrumentId,
    interval,
    realtimeQuoteInstrumentIds,
  );

  const paperOrder = usePaperOrder(organizationId, accountId || undefined);

  const tradingActions = useTradingActions(organizationId, accountId || undefined);

  const updatePositionRisk = useUpdateTradingPositionRisk(organizationId, accountId || undefined);

  const instrument = instrumentQuery.data;

  const priceMinMove = Number(instrument?.tickSize);
  const normalizedMinMove = Number.isFinite(priceMinMove) && priceMinMove > 0 ? priceMinMove : 0.01;
  const pricePrecision =
    Number.isFinite(normalizedMinMove) && normalizedMinMove > 0
      ? Math.max(0, (normalizedMinMove.toString().split(".")[1] ?? "").length)
      : 2;

  const candles = olderCursor !== undefined ? loadedCandles : (candlesQuery.data ?? []);

  // Reset historical paging when instrument or timeframe changes.
  useEffect(() => {
    setOlderCursor(undefined);
    setLoadedCandles([]);
    setHasMoreOlder(true);
  }, [instrumentId, interval]);

  // Accumulate older candle pages.
  useEffect(() => {
    const page = candlesQuery.data;

    if (!page) {
      return;
    }

    // Initial page.
    if (!olderCursor) {
      setLoadedCandles(page);
      setHasMoreOlder(page.length >= selectedTimeframe.initialLimit);
      return;
    }

    // Historical page.
    setLoadedCandles((current) => {
      const existingTimes = new Set(current.map((candle) => candle.eventTime));

      const older = page.filter((candle) => !existingTimes.has(candle.eventTime));

      if (older.length === 0) {
        setHasMoreOlder(false);
        return current;
      }

      return [...older, ...current];
    });

    if (page.length < HISTORICAL_PAGE_SIZE) {
      setHasMoreOlder(false);
    }
  }, [candlesQuery.data, olderCursor, interval, selectedTimeframe.initialLimit]);

  const requestOlderCandles = () => {
    if (!hasMoreOlder || candlesQuery.isFetching || loadedCandles.length === 0) {
      return;
    }

    setOlderCursor(loadedCandles[0]!.eventTime);
  };

  const recordRecentlyViewed = useWatchlistStore((state) => state.recordRecentlyViewed);

  useEffect(() => {
    if (instrumentId) {
      recordRecentlyViewed(instrumentId);
    }
  }, [instrumentId, recordRecentlyViewed]);

  const headerPrice = liveQuote?.lastPrice ?? liveQuote?.bidPrice ?? liveQuote?.askPrice ?? null;

  const headerPriceNumber = Number(headerPrice);

  const dailyReferenceCandle = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);

    return candles.find(
      (candle) =>
        typeof candle.eventTime === "string" && candle.eventTime.slice(0, 10) === todayKey,
    );
  }, [candles]);

  const headerDailyChange = useMemo(() => {
    const current = headerPriceNumber;
    const referenceOpen = Number(dailyReferenceCandle?.open);

    if (!Number.isFinite(current) || !Number.isFinite(referenceOpen) || referenceOpen === 0) {
      return null;
    }

    const change = current - referenceOpen;

    return {
      change,
      percent: (change / referenceOpen) * 100,
    };
  }, [headerPriceNumber, dailyReferenceCandle]);

  const currentPrices = useMemo(() => {
    const prices: Record<string, number> = {};

    for (const position of positionsQuery.data ?? []) {
      const quote = liveQuotes[position.instrumentId];

      const price =
        position.side === "SHORT"
          ? quote?.askPrice
          : quote?.bidPrice;

      if (price != null) {
        const value = Number(price);
        if (Number.isFinite(value)) {
          prices[position.instrumentId] = value;
        }
      }
    }

    for (const instrumentId of pnlConversionInstrumentIds) {
      const quote = liveQuotes[instrumentId];
      const bid = Number(quote?.bidPrice);
      const ask = Number(quote?.askPrice);
      const last = Number(quote?.lastPrice);

      const price =
        Number.isFinite(bid) && Number.isFinite(ask)
          ? (bid + ask) / 2
          : Number.isFinite(last)
            ? last
            : Number.isFinite(bid)
              ? bid
              : Number.isFinite(ask)
                ? ask
                : null;

      if (price != null && Number.isFinite(price)) {
        prices[instrumentId] = price;
      }
    }

    return prices;
  }, [positionsQuery.data, liveQuotes]);

  const instrumentPositions = useMemo(
    () => (positionsQuery.data ?? []).filter((position) => position.instrumentId === instrumentId),
    [positionsQuery.data, instrumentId],
  );

  const currentInstrumentPosition = instrumentPositions.find(
    (position) => position.status === "OPEN",
  );

  async function submitMarketOrder(side: TradingOrderSide) {
    if (!accountId || !instrumentId || !quantity.trim()) {
      return;
    }

    await paperOrder.mutateAsync({
      instrumentId,
      side,
      quantity: quantity.trim(),
      type: "MARKET",
    });
  }

  async function submitOrder(
    side: TradingOrderSide,
    stopLossPrice?: string | null,
    takeProfitPrice?: string | null,
  ) {
    if (!accountId || !instrumentId || !orderQuantity.trim()) {
      return;
    }

    await paperOrder.mutateAsync({
      instrumentId,
      side,
      quantity: orderQuantity.trim(),
      type: orderType,
      ...(orderLimitPrice.trim() ? { limitPrice: orderLimitPrice.trim() } : {}),
      ...(orderStopPrice.trim() ? { stopPrice: orderStopPrice.trim() } : {}),
      ...(stopLossPrice?.trim() ? { stopLossPrice: stopLossPrice.trim() } : {}),
      ...(takeProfitPrice?.trim() ? { takeProfitPrice: takeProfitPrice.trim() } : {}),
    });
  }

  const calculatePositionPnl = (
    position: NonNullable<typeof positionsQuery.data>[number],
  ) => {
    const current = currentPrices[position.instrumentId];
    const tradingInstrument = tradingInstruments[position.instrumentId];

    if (
      current == null ||
      !Number.isFinite(current) ||
      !tradingInstrument
    ) {
      return null;
    }

    const entry = Number(position.averageEntryPrice);
    const quantity = Number(position.quantity);
    const lotSize = Number(tradingInstrument.lotSize);

    if (
      !Number.isFinite(entry) ||
      !Number.isFinite(quantity) ||
      !Number.isFinite(lotSize) ||
      lotSize <= 0
    ) {
      return null;
    }

    const priceDelta =
      position.side === "LONG"
        ? current - entry
        : entry - current;

    const quoteCurrency = tradingInstrument.currency.toUpperCase();
    const accountCurrency = (selectedAccount?.currency ?? "USD").toUpperCase();

    let conversionRate = 1;

    if (quoteCurrency !== accountCurrency) {
      if (accountCurrency !== "USD") {
        return null;
      }

      const conversion = fxConversionByCurrency[quoteCurrency];

      if (!conversion) {
        return null;
      }

      const conversionPrice = currentPrices[conversion.instrumentId];

      if (
        conversionPrice == null ||
        !Number.isFinite(conversionPrice) ||
        conversionPrice <= 0
      ) {
        return null;
      }

      conversionRate = conversion.inverse
        ? 1 / conversionPrice
        : conversionPrice;
    }

    return priceDelta * quantity * lotSize * conversionRate;
  };

  const openPositions = (positionsQuery.data ?? []).filter(
    (position) => position.status === "OPEN",
  );

  const realizedPnl = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10);

    return (tradesQuery.data ?? []).reduce((sum, trade) => {
      if (!trade.closedAt || trade.closedAt.slice(0, 10) !== todayKey) {
        return sum;
      }

      return sum + Number(trade.realizedPnl ?? 0);
    }, 0);
  }, [tradesQuery.data]);

  const unrealizedPnl = openPositions.reduce((total, position) => {
    const pnl = calculatePositionPnl(position);
    return pnl == null ? total : total + pnl;
  }, 0);

  useEffect(() => {
    if (!templatesOpen && !drawingObjectsOpen && !chartSettingsOpen) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (templatesOpen && !templatesRef.current?.contains(target)) {
        setTemplatesOpen(false);
      }

      if (drawingObjectsOpen && !drawingObjectsRef.current?.contains(target)) {
        setDrawingObjectsOpen(false);
      }

      if (chartSettingsOpen && !chartSettingsRef.current?.contains(target)) {
        setChartSettingsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
    };
  }, [templatesOpen, drawingObjectsOpen, chartSettingsOpen]);

  if (!organizationId) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Alert>
          <AlertDescription>
            Select or configure an organization before using Trading.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      {/* ================================================================
          MOBILE TRADING UI
          ================================================================ */}
      <div className="flex h-full min-h-0 flex-col overflow-hidden bg-transparent xl:hidden">
        <TradingMobileShell activeTab={tradingMobileTab} onTabChange={setTradingMobileTab}>
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {/* MOBILE HEADER */}
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-[#07111f]/80 px-3 text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
                  <span className="text-[10px] font-bold">R</span>
                </div>

                <div className="min-w-0">
                  <div className="truncate text-xs font-bold tracking-tight">RMSM</div>
                  <div className="truncate text-[9px] text-slate-400">AI Trading</div>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-2">
                <div className="min-w-0 text-right">
                  <div className="truncate text-xs font-semibold">
                    {instrument?.symbol ?? "NAS100"}
                  </div>
                  <div className="text-muted-foreground text-[9px] tabular-nums">
                    {headerPrice ?? "—"}
                  </div>
                </div>

                <div className="border-border/70 flex h-7 items-center gap-1 rounded-md border px-2">
                  <Circle className="fill-success text-success h-2 w-2" aria-hidden="true" />
                  <span className="text-[9px] font-semibold text-emerald-300">LIVE</span>
                </div>
              </div>
            </header>

            {/* MOBILE CONTENT */}
            <div className="min-h-0 flex-1 overflow-auto p-2">
              {tradingMobileTab === "chart" ? (
                <div className="flex h-full min-h-[300px] min-w-0 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  {/* MOBILE CHART TOOLBAR */}
                  <div className="shrink-0 border-b border-cyan-200/[0.12] bg-[linear-gradient(145deg,rgba(20,43,66,0.72),rgba(5,20,35,0.58))] shadow-[0_12px_32px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(255,255,255,0.07)] backdrop-blur-2xl">
                    <div className="flex h-9 items-center justify-between px-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-xs font-semibold">
                          {instrument?.symbol ?? "NAS100"}
                        </span>
                        <span className="text-muted-foreground text-[9px]">{interval}</span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <MarketIndicatorControls
                          indicators={indicators}
                          onToggle={toggleIndicator}
                          onUpdate={updateIndicator}
                        />

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg border border-white/10 bg-white/[0.035] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                          aria-label="Chart settings"
                          title="Chart settings"
                          onClick={() => setChartSettingsOpen((value) => !value)}
                        >
                          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 text-[10px] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                          onClick={() => mobileChartViewControlsRef.current?.fitContent()}
                        >
                          Fit
                        </Button>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 text-[10px] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                          onClick={() => mobileChartViewControlsRef.current?.autoScale()}
                        >
                          Auto
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 overflow-x-auto border-t border-white/[0.08] bg-black/10 px-2 py-1">
                      {TIMEFRAMES.map((item) => {
                        const active = interval === item.value;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setInterval(item.value)}
                            aria-pressed={active}
                            className={[
                              "h-7 shrink-0 rounded-md border border-transparent px-2 text-[9px] font-semibold",
                              "outline-none transition-colors",
                              "focus-visible:ring-primary/60 focus-visible:ring-1",
                              active
                                ? "border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                            ].join(" ")}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>

                    {chartSettingsOpen ? (
                      <div className="border-t border-white/[0.08] bg-white/[0.018] p-2">
                        <MarketChartSettingsPanel
                          value={chartSettings}
                          onChange={setChartSettings}
                          onReset={() => setChartSettings(DEFAULT_MARKET_CHART_SETTINGS)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="min-h-0 flex-1 overflow-hidden">
                    {candlesQuery.isLoading ? (
                      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                        Loading market data…
                      </div>
                    ) : candles.length === 0 ? (
                      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
                        No candle data available.
                      </div>
                    ) : (
                      <RMSMCandlestickChart
                        ref={mobileChartViewControlsRef}
                        candles={candles}
                        liveCandle={liveCandle}
                        positions={instrumentPositions}
                        orders={(ordersQuery.data ?? []).filter(
                          (order) =>
                            order.instrumentId === instrumentId && order.status === "PENDING",
                        )}
                        currentPrice={
                          liveQuote?.lastPrice != null
                            ? Number(liveQuote.lastPrice)
                            : liveQuote?.bidPrice != null && liveQuote?.askPrice != null
                              ? (Number(liveQuote.bidPrice) + Number(liveQuote.askPrice)) / 2
                              : null
                        }
                        onPositionRiskChange={(positionId, risk) =>
                          updatePositionRisk.mutate({
                            positionId,
                            stopLossPrice: risk.stopLossPrice,
                            takeProfitPrice: risk.takeProfitPrice,
                          })
                        }
                        onPositionClose={(positionId) =>
                          tradingActions.closePosition.mutate(positionId)
                        }
                        onPendingOrderCancel={(orderId) =>
                          tradingActions.cancelOrder.mutate(orderId)
                        }
                        onPendingOrderPriceChange={(orderId, price) =>
                          tradingActions.updatePendingOrder.mutate({
                            orderId,
                            price: String(price),
                          })
                        }
                        onChartLimitOrder={(type, side, price, orderQty) =>
                          paperOrder.mutate({
                            instrumentId,
                            side,
                            quantity: orderQty,
                            type,
                            ...(type === "LIMIT"
                              ? { limitPrice: String(price) }
                              : { stopPrice: String(price) }),
                          })
                        }
                        interval={interval}
                        onRequestOlder={requestOlderCandles}
                        timezone="UTC"
                        pricePrecision={pricePrecision}
                        priceMinMove={normalizedMinMove}
                        chartSettings={chartSettings}
                        indicators={indicators}
                        activeDrawingTool={drawingState.activeTool}
                        drawingState={drawingState}
                        onDrawingStateChange={handleDrawingStateChange}
                      />
                    )}
                  </div>
                </div>
              ) : tradingMobileTab === "trade" ? (
                <div className="flex h-full min-h-[300px] flex-col gap-1.5 overflow-auto">
                  {/* MOBILE TRADE TICKET */}
                  <div className="flex flex-col gap-2">
                    {/* INSTRUMENT HEADER */}
                    <div className="flex items-center justify-between px-1">
                      <div className="min-w-0">
                        <div className="text-sm font-bold">{instrument?.symbol ?? "NAS100"}</div>
                        <div className="text-muted-foreground truncate text-[10px]">
                          {instrument?.name ?? instrument?.symbol ?? "NAS100"}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.035] px-2 py-1 backdrop-blur-xl">
                        <Circle className="fill-success text-success h-2 w-2" aria-hidden="true" />
                        <span className="text-[9px] font-semibold text-emerald-300">LIVE</span>
                      </div>
                    </div>

                    {/* ORDER TYPE */}
                    <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                      {(
                        [
                          ["MARKET", "Market"],
                          ["LIMIT", "Limit"],
                          ["STOP", "Stop"],
                        ] as const
                      ).map(([value, label]) => {
                        const active =
                          orderType === value || (value === "STOP" && orderType === "STOP_LIMIT");

                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setOrderType(value as TradingOrderType)}
                            className={[
                              "h-9 rounded-md text-xs font-semibold transition-colors",
                              "focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-1",
                              active
                                ? "border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_18px_rgba(34,211,238,0.08)]"
                                : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                            ].join(" ")}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* SELL / BUY QUOTES */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          void submitOrder(
                            "SELL",
                            mobileStopLossEnabled ? mobileStopLossPrice : null,
                            mobileTakeProfitEnabled ? mobileTakeProfitPrice : null,
                          );
                        }}
                        disabled={paperOrder.isPending || !orderQuantity.trim()}
                        className="flex min-h-[82px] flex-col justify-between rounded-xl border border-red-400/25 bg-red-500/[0.09] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_24px_rgba(248,113,113,0.06)] backdrop-blur-xl transition-colors hover:bg-red-500/[0.14] disabled:pointer-events-none disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-destructive text-[10px] font-bold uppercase tracking-wide">
                            Sell
                          </span>
                          <span className="text-muted-foreground text-[9px]">BID</span>
                        </div>

                        <div className="text-lg font-bold tabular-nums">
                          {liveQuote?.bidPrice != null
                            ? Number(liveQuote.bidPrice).toFixed(pricePrecision)
                            : "—"}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          void submitOrder(
                            "BUY",
                            mobileStopLossEnabled ? mobileStopLossPrice : null,
                            mobileTakeProfitEnabled ? mobileTakeProfitPrice : null,
                          );
                        }}
                        disabled={paperOrder.isPending || !orderQuantity.trim()}
                        className="flex min-h-[82px] flex-col justify-between rounded-xl border border-emerald-400/25 bg-emerald-500/[0.09] p-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_24px_rgba(52,211,153,0.06)] backdrop-blur-xl transition-colors hover:bg-emerald-500/[0.14] disabled:pointer-events-none disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-success text-[10px] font-bold uppercase tracking-wide">
                            Buy
                          </span>
                          <span className="text-muted-foreground text-[9px]">ASK</span>
                        </div>

                        <div className="text-lg font-bold tabular-nums">
                          {liveQuote?.askPrice != null
                            ? Number(liveQuote.askPrice).toFixed(pricePrecision)
                            : "—"}
                        </div>
                      </button>
                    </div>

                    {/* QUANTITY */}
                    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-muted-foreground text-xs font-medium">Quantity</span>
                        <span className="text-muted-foreground text-[9px]">Lots</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          onClick={() => {
                            const current = Number(orderQuantity);
                            const next = Math.max(1, (Number.isFinite(current) ? current : 1) - 1);
                            setOrderQuantity(String(next));
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-lg font-semibold hover:bg-white/[0.07]"
                        >
                          −
                        </button>

                        <input
                          id="mobile-trade-quantity"
                          type="number"
                          min="1"
                          step="1"
                          inputMode="decimal"
                          value={orderQuantity}
                          onChange={(event) => setOrderQuantity(event.target.value)}
                          className="h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-center text-base font-semibold tabular-nums outline-none backdrop-blur-lg focus:ring-1 focus:ring-cyan-300/50"
                          aria-label="Order quantity"
                        />

                        <button
                          type="button"
                          aria-label="Increase quantity"
                          onClick={() => {
                            const current = Number(orderQuantity);
                            const next = (Number.isFinite(current) ? current : 0) + 1;
                            setOrderQuantity(String(next));
                          }}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.035] text-lg font-semibold hover:bg-white/[0.07]"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* MOBILE TP / SL */}
                    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          aria-pressed={mobileTakeProfitEnabled}
                          onClick={() => setMobileTakeProfitEnabled((enabled) => !enabled)}
                          className={[
                            "flex h-10 items-center justify-between rounded-lg",
                            "border px-3 text-left transition-colors",
                            mobileTakeProfitEnabled
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100 shadow-[0_0_18px_rgba(52,211,153,0.06)]"
                              : "border-white/10 bg-white/[0.025] text-slate-400",
                          ].join(" ")}
                        >
                          <span className="text-[11px] font-medium">Take Profit</span>
                          <span
                            className={[
                              "relative h-5 w-9 rounded-full transition-colors",
                              mobileTakeProfitEnabled ? "bg-emerald-400" : "bg-white/15",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            <span
                              className={[
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                mobileTakeProfitEnabled ? "translate-x-4" : "translate-x-0.5",
                              ].join(" ")}
                            />
                          </span>
                        </button>

                        <button
                          type="button"
                          aria-pressed={mobileStopLossEnabled}
                          onClick={() => setMobileStopLossEnabled((enabled) => !enabled)}
                          className={[
                            "flex h-10 items-center justify-between rounded-lg",
                            "border px-3 text-left transition-colors",
                            mobileStopLossEnabled
                              ? "border-red-400/30 bg-red-400/10 text-red-100 shadow-[0_0_18px_rgba(248,113,113,0.06)]"
                              : "border-white/10 bg-white/[0.025] text-slate-400",
                          ].join(" ")}
                        >
                          <span className="text-[11px] font-medium">Stop Loss</span>
                          <span
                            className={[
                              "relative h-5 w-9 rounded-full transition-colors",
                              mobileStopLossEnabled ? "bg-red-400" : "bg-white/15",
                            ].join(" ")}
                            aria-hidden="true"
                          >
                            <span
                              className={[
                                "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
                                mobileStopLossEnabled ? "translate-x-4" : "translate-x-0.5",
                              ].join(" ")}
                            />
                          </span>
                        </button>
                      </div>

                      {mobileTakeProfitEnabled ? (
                        <div className="mt-2">
                          <label
                            htmlFor="mobile-trade-take-profit"
                            className="text-muted-foreground mb-1 block text-[10px] font-medium"
                          >
                            Take Profit Price
                          </label>
                          <input
                            id="mobile-trade-take-profit"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={mobileTakeProfitPrice}
                            onChange={(event) => setMobileTakeProfitPrice(event.target.value)}
                            placeholder="Enter take profit price"
                            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm tabular-nums outline-none backdrop-blur-lg focus:ring-1 focus:ring-cyan-300/50"
                          />
                        </div>
                      ) : null}

                      {mobileStopLossEnabled ? (
                        <div className="mt-2">
                          <label
                            htmlFor="mobile-trade-stop-loss"
                            className="text-muted-foreground mb-1 block text-[10px] font-medium"
                          >
                            Stop Loss Price
                          </label>
                          <input
                            id="mobile-trade-stop-loss"
                            type="number"
                            step="any"
                            inputMode="decimal"
                            value={mobileStopLossPrice}
                            onChange={(event) => setMobileStopLossPrice(event.target.value)}
                            placeholder="Enter stop loss price"
                            className="h-10 w-full rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm tabular-nums outline-none backdrop-blur-lg focus:ring-1 focus:ring-cyan-300/50"
                          />
                        </div>
                      ) : null}
                    </div>

                    {/* CONDITIONAL PRICES */}
                    {orderType === "LIMIT" || orderType === "STOP_LIMIT" ? (
                      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                        <label
                          htmlFor="mobile-trade-limit-price"
                          className="text-muted-foreground mb-1.5 block text-xs font-medium"
                        >
                          Limit Price
                        </label>
                        <input
                          id="mobile-trade-limit-price"
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={orderLimitPrice}
                          onChange={(event) => setOrderLimitPrice(event.target.value)}
                          placeholder="Enter limit price"
                          className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm tabular-nums outline-none backdrop-blur-lg focus:ring-1 focus:ring-cyan-300/50"
                        />
                      </div>
                    ) : null}

                    {orderType === "STOP" || orderType === "STOP_LIMIT" ? (
                      <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] p-3 shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                        <label
                          htmlFor="mobile-trade-stop-price"
                          className="text-muted-foreground mb-1.5 block text-xs font-medium"
                        >
                          Stop Price
                        </label>
                        <input
                          id="mobile-trade-stop-price"
                          type="number"
                          step="any"
                          inputMode="decimal"
                          value={orderStopPrice}
                          onChange={(event) => setOrderStopPrice(event.target.value)}
                          placeholder="Enter stop price"
                          className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.035] px-3 text-sm tabular-nums outline-none backdrop-blur-lg focus:ring-1 focus:ring-cyan-300/50"
                        />
                      </div>
                    ) : null}

                    {/* STOP LIMIT DETAIL */}
                    {orderType === "STOP_LIMIT" ? (
                      <div className="text-muted-foreground px-1 text-[9px]">
                        Stop Limit uses both stop and limit prices.
                      </div>
                    ) : null}

                    {paperOrder.isPending ? (
                      <div className="text-muted-foreground px-3 pb-1 text-center text-[10px]">
                        Submitting order…
                      </div>
                    ) : null}

                    {paperOrder.error instanceof Error ? (
                      <div className="text-destructive px-3 pb-1 text-center text-[10px]">
                        {paperOrder.error.message}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : tradingMobileTab === "markets" ? (
                <div className="flex h-full min-h-[300px] flex-col overflow-hidden">
                  {/* MOBILE MARKETS V4 */}
                  <div className="shrink-0 border-b border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div>
                        <div className="text-sm font-semibold">Markets</div>
                        <div className="text-muted-foreground text-[10px]">Live market watch</div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="bg-success h-1.5 w-1.5 rounded-full" />
                        <span className="text-[9px] font-semibold text-emerald-300">LIVE</span>
                      </div>
                    </div>

                    <div className="px-2 pb-2">
                      <div className="flex h-9 items-center gap-2 rounded-xl border border-cyan-200/[0.13] bg-[rgba(3,16,29,0.52)] px-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_8px_22px_rgba(0,0,0,0.16)] backdrop-blur-xl">
                        <Search
                          className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                          aria-hidden="true"
                        />

                        <input
                          type="search"
                          value={mobileMarketSearch}
                          onChange={(event) => setMobileMarketSearch(event.target.value)}
                          placeholder="Search symbol or instrument"
                          aria-label="Search markets"
                          className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
                        />

                        {mobileMarketSearch ? (
                          <button
                            type="button"
                            onClick={() => setMobileMarketSearch("")}
                            className="text-muted-foreground hover:text-foreground shrink-0 px-1 text-[10px]"
                            aria-label="Clear market search"
                          >
                            Clear
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex gap-1 overflow-x-auto px-2 pb-2">
                      {mobileMarketAssetClasses.map((assetClass) => {
                        const active = mobileMarketAssetClass === assetClass;

                        return (
                          <button
                            key={assetClass}
                            type="button"
                            onClick={() => setMobileMarketAssetClass(assetClass)}
                            aria-pressed={active}
                            className={[
                              "h-8 shrink-0 rounded-lg border border-transparent px-2.5 text-[9px] font-semibold",
                              "transition-colors",
                              active
                                ? "border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                                : "border border-white/10 bg-white/[0.025] text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
                            ].join(" ")}
                          >
                            {assetClass}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-auto">
                    {instrumentsQuery.isLoading ? (
                      <div className="text-muted-foreground px-3 py-10 text-center text-xs">
                        Loading markets…
                      </div>
                    ) : mobileMarketInstruments.length === 0 ? (
                      <div className="px-3 py-10 text-center">
                        <div className="text-xs font-medium">No instruments found</div>
                        <div className="text-muted-foreground mt-1 text-[10px]">
                          Try another symbol or asset class.
                        </div>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/[0.06]">
                        {mobileMarketInstruments.map((item) => {
                          const quote = liveQuotes[item.id];

                          const last = quote?.lastPrice != null ? Number(quote.lastPrice) : null;

                          const bid = quote?.bidPrice != null ? Number(quote.bidPrice) : null;

                          const ask = quote?.askPrice != null ? Number(quote.askPrice) : null;

                          const precision = item.tickSize
                            ? Math.max(0, String(item.tickSize).split(".")[1]?.length ?? 0)
                            : 5;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full border-b border-white/[0.045] bg-transparent px-3 py-3 text-left transition-all hover:bg-white/[0.035] active:bg-white/[0.06]"
                              onClick={() => {
                                setInstrumentId(item.id);
                                setTradingMobileTab("chart");
                              }}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="truncate text-xs font-bold">
                                      {item.symbol}
                                    </span>

                                    <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.025] px-1.5 py-0.5 text-[8px] font-medium text-slate-400">
                                      {item.assetClass}
                                    </span>
                                  </div>

                                  <div className="text-muted-foreground mt-0.5 truncate text-[9px]">
                                    {item.name}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  <div className="text-xs font-bold tabular-nums">
                                    {last != null ? last.toFixed(precision) : "—"}
                                  </div>

                                  <div className="text-muted-foreground mt-0.5 text-[8px]">
                                    LAST
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 grid grid-cols-2 gap-2">
                                <div className="rounded-lg border border-cyan-200/[0.09] bg-[rgba(255,255,255,0.025)] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-md">
                                  <div className="text-muted-foreground text-[8px]">BID</div>

                                  <div className="mt-0.5 text-[10px] font-semibold tabular-nums">
                                    {bid != null ? bid.toFixed(precision) : "—"}
                                  </div>
                                </div>

                                <div className="rounded-lg border border-cyan-200/[0.09] bg-[rgba(255,255,255,0.025)] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-md">
                                  <div className="text-muted-foreground text-[8px]">ASK</div>

                                  <div className="mt-0.5 text-[10px] font-semibold tabular-nums">
                                    {ask != null ? ask.toFixed(precision) : "—"}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : tradingMobileTab === "more" ? (
                <div className="flex h-full min-h-[300px] flex-col gap-2 overflow-auto">
                  {/* MOBILE MORE V5 */}

                  {/* ACCOUNT SUMMARY */}
                  <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    <div className="border-b border-white/[0.08] px-3 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold">Account</div>
                          <div className="text-muted-foreground mt-0.5 text-[10px]">
                            Trading account
                          </div>
                        </div>

                        <div className="rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-2 py-1 text-[9px] font-semibold text-emerald-300">
                          DEMO
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-3">
                      <div className="rounded-md border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-lg">
                        <div className="text-muted-foreground text-[9px]">Balance</div>
                        <div className="mt-1 text-sm font-bold tabular-nums">
                          {money(selectedAccount?.balance)}
                        </div>
                      </div>

                      <div className="rounded-md border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-lg">
                        <div className="text-muted-foreground text-[9px]">Equity</div>
                        <div className="mt-1 text-sm font-bold tabular-nums">
                          {selectedAccount?.balance != null
                            ? money(Number(selectedAccount.balance) + unrealizedPnl)
                            : "—"}
                        </div>
                      </div>

                      <div className="rounded-md border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-lg">
                        <div className="text-muted-foreground text-[9px]">Unrealized P&L</div>
                        <div
                          className={[
                            "mt-1 text-sm font-bold tabular-nums",
                            unrealizedPnl >= 0 ? "text-success" : "text-destructive",
                          ].join(" ")}
                        >
                          {money(unrealizedPnl)}
                        </div>
                      </div>

                      <div className="rounded-md border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-lg">
                        <div className="text-muted-foreground text-[9px]">
                          Today&apos;s Realized P&L
                        </div>
                        <div
                          className={[
                            "mt-1 text-sm font-bold tabular-nums",
                            realizedPnl >= 0 ? "text-success" : "text-destructive",
                          ].join(" ")}
                        >
                          {money(realizedPnl)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACCOUNT DETAILS */}
                  <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    <div className="border-b border-white/[0.08] px-3 py-3">
                      <div className="text-sm font-semibold">Account Details</div>
                    </div>

                    <div className="divide-y divide-white/[0.06]">
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-muted-foreground text-[10px]">Account</span>
                        <span className="max-w-[65%] truncate text-right text-xs font-medium">
                          {selectedAccount?.name ?? "RMSM Demo"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-muted-foreground text-[10px]">Type</span>
                        <span className="text-xs font-medium">
                          {selectedAccount?.type ?? "DEMO"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-muted-foreground text-[10px]">Currency</span>
                        <span className="text-xs font-medium">
                          {selectedAccount?.currency ?? "USD"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-muted-foreground text-[10px]">Account ID</span>
                        <span className="text-muted-foreground max-w-[65%] truncate text-right font-mono text-[9px]">
                          {selectedAccount?.id ?? "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* QUICK ACCESS */}
                  <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    <div className="border-b border-white/[0.08] px-3 py-3">
                      <div className="text-sm font-semibold">Quick Access</div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 p-3">
                      <button
                        type="button"
                        onClick={() => router.push("/portfolio")}
                        className="hover:bg-muted/50 flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-3 text-center backdrop-blur-lg transition-colors"
                      >
                        <Wallet className="text-muted-foreground h-5 w-5" />
                        <span className="text-[10px] font-semibold">Portfolio</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/analytics")}
                        className="hover:bg-muted/50 flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-3 text-center backdrop-blur-lg transition-colors"
                      >
                        <BarChart3 className="text-muted-foreground h-5 w-5" />
                        <span className="text-[10px] font-semibold">Analytics</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push("/settings/profile")}
                        className="hover:bg-muted/50 flex min-h-20 flex-col items-center justify-center gap-2 rounded-md border border-white/[0.08] bg-white/[0.025] px-2 py-3 text-center backdrop-blur-lg transition-colors"
                      >
                        <Settings className="text-muted-foreground h-5 w-5" />
                        <span className="text-[10px] font-semibold">Settings</span>
                      </button>
                    </div>
                  </div>

                  {/* PREFERENCES */}
                  <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                    <div className="border-b border-white/[0.08] px-3 py-3">
                      <div className="text-sm font-semibold">Preferences</div>
                    </div>

                    <div className="divide-y divide-white/[0.06]">
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="flex w-full items-center justify-between px-3 py-3 text-left transition-colors hover:bg-white/[0.035]"
                      >
                        <div>
                          <div className="text-xs font-medium">Theme</div>
                          <div className="text-muted-foreground mt-0.5 text-[9px]">
                            {theme === "light" ? "Light mode" : "Dark mode"}
                          </div>
                        </div>

                        <div className="border-border/60 rounded-md border px-2 py-1 text-[9px] font-semibold">
                          {theme === "light" ? "LIGHT" : "DARK"}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* SIGN OUT */}
                  <div className="rounded-2xl border border-red-300/[0.18] bg-[linear-gradient(145deg,rgba(127,29,29,0.20),rgba(69,10,10,0.12))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.045),0_10px_28px_rgba(0,0,0,0.18),0_0_22px_rgba(239,68,68,0.045)] backdrop-blur-xl">
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-10 w-full border border-red-300/[0.22] bg-red-500/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_0_18px_rgba(239,68,68,0.08)] hover:bg-red-500/[0.16]"
                      disabled={logout.isPending}
                      onClick={() => {
                        void handleLogout();
                      }}
                    >
                      {logout.isPending ? "Signing out…" : "Sign out"}
                    </Button>
                  </div>
                </div>
              ) : tradingMobileTab === "orders" ? (
                <div className="flex h-full min-h-[300px] flex-col gap-2 overflow-auto">
                  {/* POSITIONS / ORDERS SWITCHER */}
                  <div className="grid grid-cols-2 rounded-2xl border border-white/[0.09] bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl">
                    {(
                      [
                        ["positions", "Positions"],
                        ["orders", "Orders"],
                      ] as const
                    ).map(([value, label]) => {
                      const active = mobileOrdersView === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setMobileOrdersView(value)}
                          aria-pressed={active}
                          className={[
                            "h-9 rounded-md text-xs font-semibold transition-colors",
                            "focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-1",
                            active
                              ? "border border-cyan-300/20 bg-cyan-400/10 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_18px_rgba(34,211,238,0.08)]"
                              : "text-slate-400 hover:bg-white/[0.04] hover:text-slate-100",
                          ].join(" ")}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {mobileOrdersView === "positions" ? (
                    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                      <div className="border-b border-white/[0.08] px-3 py-3">
                        <div className="text-sm font-semibold">Open Positions</div>
                        <div className="text-muted-foreground mt-0.5 text-[10px]">
                          Live positions and unrealized P&L
                        </div>
                      </div>

                      {positionsQuery.isLoading ? (
                        <div className="text-muted-foreground py-10 text-center text-xs">
                          Loading positions…
                        </div>
                      ) : openPositions.length === 0 ? (
                        <div className="px-3 py-10 text-center">
                          <div className="text-sm font-medium">No open positions</div>
                          <div className="text-muted-foreground mt-1 text-[10px]">
                            Open positions will appear here.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 p-2">
                          {openPositions.map((position) => {
                            const positionInstrument = instrumentsQuery.data?.data.find(
                              (item) => item.id === position.instrumentId,
                            );

                            const symbol =
                              positionInstrument?.symbol ??
                              (position.instrumentId === instrumentId
                                ? instrument?.symbol
                                : undefined) ??
                              "Instrument";

                            const current = currentPrices[position.instrumentId];

                            const pnl = calculatePositionPnl(position);

                            const pnlPositive = pnl != null ? pnl >= 0 : null;

                            return (
                              <div
                                key={position.id}
                                className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-lg"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-bold">{symbol}</span>

                                      <span
                                        className={
                                          position.side === "LONG"
                                            ? "rounded-md border border-emerald-300/15 bg-emerald-400/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300"
                                            : "rounded-md border border-red-300/15 bg-red-400/10 px-1.5 py-0.5 text-[9px] font-bold text-red-300"
                                        }
                                      >
                                        {position.side === "LONG" ? "BUY" : "SELL"}
                                      </span>
                                    </div>

                                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                                      <div>
                                        <div className="text-muted-foreground text-[9px]">
                                          Quantity
                                        </div>
                                        <div className="text-xs font-semibold tabular-nums">
                                          {position.quantity}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-muted-foreground text-[9px]">
                                          Entry
                                        </div>
                                        <div className="text-xs font-semibold tabular-nums">
                                          {Number.isFinite(Number(position.averageEntryPrice))
                                            ? Number(position.averageEntryPrice).toFixed(pricePrecision)
                                            : "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-muted-foreground text-[9px]">
                                          Current
                                        </div>
                                        <div className="text-xs font-semibold tabular-nums">
                                          {current != null
                                            ? current.toFixed(pricePrecision)
                                            : "—"}
                                        </div>
                                      </div>

                                      <div>
                                        <div className="text-muted-foreground text-[9px]">P&L</div>
                                        <div
                                          className={[
                                            "text-xs font-bold tabular-nums",
                                            pnlPositive === true
                                              ? "text-success"
                                              : pnlPositive === false
                                                ? "text-destructive"
                                                : "text-muted-foreground",
                                          ].join(" ")}
                                        >
                                          {pnl != null
                                            ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`
                                            : "—"}
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-8 shrink-0 rounded-lg border border-red-300/20 bg-red-400/[0.06] px-3 text-[10px] font-semibold text-red-300 hover:bg-red-400/[0.12] hover:text-red-200"
                                    disabled={tradingActions.isPending}
                                    onClick={() => tradingActions.closePosition.mutate(position.id)}
                                  >
                                    Close
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                      <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-3">
                        <div>
                          <div className="text-sm font-semibold">Pending Orders</div>
                          <div className="text-muted-foreground mt-0.5 text-[10px]">
                            {instrument?.symbol ?? "NAS100"} · Pending
                          </div>
                        </div>

                        {(ordersQuery.data ?? []).some(
                          (order) =>
                            order.instrumentId === instrumentId && order.status === "PENDING",
                        ) ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg border border-white/10 bg-white/[0.035] px-2.5 text-[10px] text-slate-300 hover:bg-white/[0.07] hover:text-white"
                            disabled={tradingActions.isPending}
                            onClick={() => tradingActions.cancelAllOrders.mutate()}
                          >
                            {tradingActions.isPending ? "Cancelling…" : "Cancel All"}
                          </Button>
                        ) : null}
                      </div>

                      <div className="p-2">
                        {ordersQuery.isLoading ? (
                          <div className="text-muted-foreground py-8 text-center text-xs">
                            Loading orders…
                          </div>
                        ) : (
                          (() => {
                            const pendingOrders = (ordersQuery.data ?? []).filter(
                              (order) =>
                                order.instrumentId === instrumentId && order.status === "PENDING",
                            );

                            if (pendingOrders.length === 0) {
                              return (
                                <div className="py-8 text-center">
                                  <div className="text-sm font-medium">No pending orders</div>
                                  <div className="text-muted-foreground mt-1 text-[10px]">
                                    Pending LIMIT and STOP orders will appear here.
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div className="space-y-2">
                                {pendingOrders.map((order) => (
                                  <div
                                    key={order.id}
                                    className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-lg"
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={
                                              order.side === "BUY"
                                                ? "text-success text-xs font-bold"
                                                : "text-destructive text-xs font-bold"
                                            }
                                          >
                                            {order.side}
                                          </span>

                                          <span className="text-[10px] font-semibold">
                                            {order.type}
                                          </span>

                                          <span className="border-border/60 text-muted-foreground rounded border px-1.5 py-0.5 text-[9px]">
                                            PENDING
                                          </span>
                                        </div>

                                        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                                          <div>
                                            <div className="text-muted-foreground text-[9px]">
                                              Quantity
                                            </div>
                                            <div className="text-xs font-semibold tabular-nums">
                                              {order.quantity}
                                            </div>
                                          </div>

                                          <div>
                                            <div className="text-muted-foreground text-[9px]">
                                              Price
                                            </div>
                                            <div className="text-xs font-semibold tabular-nums">
                                              {order.limitPrice ?? order.stopPrice ?? "—"}
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-8 shrink-0 rounded-lg border border-red-300/20 bg-red-400/[0.06] px-3 text-[10px] text-red-300 hover:bg-red-400/[0.12] hover:text-red-200"
                                        disabled={tradingActions.isPending}
                                        onClick={() => tradingActions.cancelOrder.mutate(order.id)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center rounded-2xl border border-white/[0.09] bg-white/[0.035] shadow-[0_10px_30px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
                  <div className="text-center">
                    <div className="text-sm font-semibold capitalize">{tradingMobileTab}</div>
                    <div className="text-muted-foreground mt-1 text-xs">Mobile workspace</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TradingMobileShell>
      </div>

      {/* ================================================================
          EXISTING DESKTOP TRADING UI
          ================================================================ */}
      <div className="bg-background hidden h-full min-h-0 flex-col overflow-hidden xl:flex">
        {/* TERMINAL HEADER */}
        <header className="border-border/70 bg-card/95 mb-2 flex h-14 shrink-0 items-center overflow-hidden rounded-md border px-2 backdrop-blur-sm">
          {/* GLOBAL MENU */}
          <div className="border-border/70 flex h-full shrink-0 items-center border-r pr-2">
            <button
              type="button"
              onClick={toggleSidebar}
              className="text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-9 w-9 items-center justify-center rounded-md transition-colors"
              aria-label="Toggle sidebar"
              title="Toggle sidebar"
            >
              <Menu className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* INSTRUMENT / LIVE PRICE */}
          <div className="flex min-w-0 flex-1 items-center gap-3 px-3">
            <div className="flex shrink-0 items-center">
              <span className="text-sm font-semibold">{instrument?.symbol ?? "NAS100"}</span>
            </div>

            <div className="bg-border hidden h-6 w-px sm:block" />

            <div className="min-w-0">
              <div className="text-sm font-semibold tabular-nums leading-4">
                {headerPrice ?? "—"}
              </div>
              <div
                className={[
                  "text-[10px] font-medium tabular-nums",
                  (headerDailyChange?.change ?? 0) >= 0 ? "text-success" : "text-destructive",
                ].join(" ")}
              >
                {(headerDailyChange?.change ?? 0) >= 0 ? "+" : ""}
                {(headerDailyChange?.change ?? 0).toFixed(1)}
                {" ("}
                {(headerDailyChange?.percent ?? 0) >= 0 ? "+" : ""}
                {(headerDailyChange?.percent ?? 0).toFixed(2)}
                {"%)"}
              </div>
            </div>
          </div>

          {/* ACCOUNT / TRADING STATUS */}
          <div className="flex h-full shrink-0 items-center px-2">
            <div className="border-border/70 bg-background/30 flex h-10 items-center rounded-md border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-9 rounded-l-md rounded-r-none px-3"
                    aria-label="Select trading account"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground text-[8px] uppercase tracking-wider">
                        Account
                      </span>
                      <span className="max-w-[110px] truncate text-xs font-semibold">
                        {selectedAccount?.name ?? "RMSM Demo"}
                      </span>
                      <ChevronDown
                        className="text-muted-foreground h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                    </span>
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" sideOffset={6}>
                  {demoAccounts.map((account) => (
                    <DropdownMenuItem
                      key={account.id}
                      onSelect={() => setAccountId(account.id)}
                      className="flex items-center justify-between gap-4"
                    >
                      <span>{account.name}</span>
                      {account.id === accountId && (
                        <span className="text-success text-[10px] font-semibold">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="border-border/70 flex h-7 items-center gap-1.5 border-l px-3">
                <Circle className="fill-success text-success h-2.5 w-2.5" aria-hidden="true" />
                <span className="text-success text-[10px] font-medium">LIVE</span>
              </div>
            </div>
          </div>

          {/* ACCOUNT METRICS */}
          <div className="border-border/70 flex h-full shrink-0 items-center gap-4 border-l px-3">
            <div className="flex flex-col justify-center">
              <span className="text-muted-foreground text-[8px] uppercase tracking-wider">
                Balance
              </span>
              <span className="text-xs font-semibold tabular-nums">
                {money(selectedAccount?.balance)}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-muted-foreground text-[8px] uppercase tracking-wider">
                RP&L
              </span>
              <span
                className={[
                  "text-xs font-semibold tabular-nums",
                  realizedPnl >= 0 ? "text-success" : "text-destructive",
                ].join(" ")}
              >
                {money(realizedPnl)}
              </span>
            </div>

            <div className="flex flex-col justify-center">
              <span className="text-muted-foreground text-[8px] uppercase tracking-wider">
                UP&L
              </span>
              <span
                className={[
                  "text-xs font-semibold tabular-nums",
                  unrealizedPnl >= 0 ? "text-success" : "text-destructive",
                ].join(" ")}
              >
                {money(unrealizedPnl)}
              </span>
            </div>
          </div>

          {/* GLOBAL NOTIFICATIONS */}
          <div className="border-border/70 flex h-full items-center border-l pl-2">
            <NotificationCenter />
          </div>

          {/* GLOBAL THEME */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
            title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Sun className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>

          {/* GLOBAL USER MENU */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="User menu" title="User menu">
                <UserIcon className="h-4 w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="text-muted-foreground max-w-[220px] truncate font-normal">
                {user?.email}
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => router.push("/settings/profile")}>
                Profile
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => router.push("/settings/preferences")}>
                Preferences
              </DropdownMenuItem>

              <DropdownMenuItem onSelect={() => router.push("/settings/security")}>
                Security settings
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={handleLogout} disabled={logout.isPending}>
                <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                {logout.isPending ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* TERMINAL BODY */}
        <div className="flex min-h-0 flex-1 gap-2 overflow-hidden">
          {/* MAIN WORKSPACE */}
          <main className="bg-background flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">
            {/* CHART TOOLBAR */}
            <div className="border-border/70 bg-card/45 relative flex h-12 shrink-0 items-center justify-between overflow-visible rounded-md border px-3">
              <div className="flex min-w-0 items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-9 min-w-[145px] justify-between gap-3 rounded-md px-2"
                      aria-label="Select instrument"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="text-sm">⌕</span>
                        <span className="truncate text-sm font-semibold">
                          {instrument?.symbol ?? "NAS100"}
                        </span>
                      </span>

                      <ChevronDown
                        className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                        aria-hidden="true"
                      />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="start"
                    sideOffset={6}
                    className="w-[260px] p-1"
                    onCloseAutoFocus={() => {
                      setInstrumentSearchQuery("");
                    }}
                  >
                    <div className="bg-popover sticky top-0 z-10 pb-1">
                      <input
                        type="search"
                        value={instrumentSearchQuery}
                        onChange={(event) => setInstrumentSearchQuery(event.target.value)}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                        }}
                        placeholder="Search instruments..."
                        aria-label="Search instruments"
                        data-testid="instrument-search"
                        className="bg-background placeholder:text-muted-foreground focus:ring-primary h-8 w-full rounded-md border px-2 text-xs outline-none focus:ring-1"
                      />
                    </div>

                    <div className="max-h-[300px] overflow-y-auto">
                      {filteredInstruments.map((item) => (
                        <DropdownMenuItem
                          key={item.id}
                          onSelect={() => {
                            setInstrumentId(item.id);
                            setInstrumentSearchQuery("");
                          }}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-xs font-semibold">{item.symbol}</div>
                            <div className="text-muted-foreground truncate text-[10px]">
                              {item.name}
                            </div>
                          </div>

                          {item.id === instrumentId && (
                            <span className="text-success text-[10px] font-semibold">✓</span>
                          )}
                        </DropdownMenuItem>
                      ))}

                      {filteredInstruments.length === 0 && (
                        <div className="text-muted-foreground px-2 py-3 text-center text-xs">
                          No instruments found.
                        </div>
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                <div className="bg-border/70 hidden h-5 w-px sm:block" aria-hidden="true" />

                <div
                  className="border-border/50 bg-background/30 flex items-center gap-0.5 rounded-md border p-0.5"
                  role="group"
                  aria-label="Chart timeframe"
                >
                  {TIMEFRAMES.map((item) => {
                    const active = interval === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setInterval(item.value)}
                        aria-pressed={active}
                        className={[
                          "h-7 min-w-[30px] rounded px-2 text-[10px] font-semibold",
                          "outline-none transition-colors",
                          "focus-visible:ring-primary/60 focus-visible:ring-1",
                          active
                            ? "bg-success text-success-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                        ].join(" ")}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MarketIndicatorControls
                  indicators={indicators}
                  onToggle={toggleIndicator}
                  onUpdate={updateIndicator}
                />

                <div ref={drawingObjectsRef} className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={[
                      "h-7 w-7 border-0 bg-transparent p-0 shadow-none",
                      "hover:bg-muted/70 hover:text-foreground",
                      drawingObjectsOpen ? "bg-muted/70 text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                    aria-label="Objects"
                    aria-expanded={drawingObjectsOpen}
                    aria-controls="trading-chart-objects"
                    title="Objects"
                    onClick={() => setDrawingObjectsOpen((value) => !value)}
                  >
                    <Box className="h-4 w-4" aria-hidden="true" />
                  </Button>

                  {drawingObjectsOpen ? (
                    <div
                      id="trading-chart-objects"
                      className="absolute right-0 top-full z-[200] mt-2 w-[min(420px,calc(100vw-1rem))] max-w-[calc(100vw-1rem)]"
                    >
                      <MarketDrawingObjectManager
                        state={drawingState}
                        onClose={() => setDrawingObjectsOpen(false)}
                        onSelect={handleDrawingSelect}
                        onVisibilityChange={handleDrawingVisibility}
                        onLockChange={handleDrawingLock}
                        onDuplicate={handleDrawingDuplicate}
                        onDelete={handleDrawingDelete}
                        onBringForward={handleDrawingBringForward}
                        onSendBackward={handleDrawingSendBackward}
                        onBringToFront={handleDrawingBringToFront}
                        onSendToBack={handleDrawingSendToBack}
                        onShowAll={handleShowAllDrawings}
                        onHideAll={handleHideAllDrawings}
                        onDeleteAll={handleDeleteAllDrawings}
                      />
                    </div>
                  ) : null}
                </div>

                <div ref={templatesRef} className="relative">
                  <MarketChartTemplateMenu
                    indicators={indicators}
                    chartSettings={chartSettings}
                    open={templatesOpen}
                    onOpenChange={setTemplatesOpen}
                    onApplyTemplate={(template) => {
                      const cloned = cloneMarketChartTemplate(template);

                      setIndicators(cloned.indicators);
                      setChartSettings(cloned.chartSettings);
                    }}
                    containerRef={templatesRef}
                  />
                </div>

                <div ref={chartSettingsRef} className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:bg-muted/70 hover:text-foreground h-7 w-7 border-0 bg-transparent p-0 shadow-none"
                    aria-label="Chart settings"
                    aria-expanded={chartSettingsOpen}
                    aria-haspopup="dialog"
                    title="Chart settings"
                    onClick={() => setChartSettingsOpen((value) => !value)}
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </Button>

                  {chartSettingsOpen ? (
                    <div className="absolute right-0 top-full z-[100] mt-2">
                      <MarketChartSettingsPanel
                        value={chartSettings}
                        onChange={setChartSettings}
                        onReset={() => setChartSettings(DEFAULT_MARKET_CHART_SETTINGS)}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="bg-border/60 h-4 w-px" />

                <div className="border-border/50 bg-background/30 flex items-center gap-0.5 rounded-md border p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/70 hover:text-foreground h-7 min-w-[30px] border-0 bg-transparent px-2 text-[10px] font-medium shadow-none disabled:pointer-events-none disabled:opacity-35"
                    onClick={handleUndoDrawing}
                    disabled={drawingHistory.past.length === 0}
                    aria-label="Undo drawing"
                    title="Undo"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/70 hover:text-foreground h-7 min-w-[30px] border-0 bg-transparent px-2 text-[10px] font-medium shadow-none disabled:pointer-events-none disabled:opacity-35"
                    onClick={handleRedoDrawing}
                    disabled={drawingHistory.future.length === 0}
                    aria-label="Redo drawing"
                    title="Redo"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>

                  <div className="bg-border/60 mx-0.5 h-4 w-px" />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/70 hover:text-foreground h-7 min-w-[30px] border-0 bg-transparent px-2 text-[10px] font-medium shadow-none"
                    onClick={() => chartViewControlsRef.current?.fitContent()}
                  >
                    Fit
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/70 hover:text-foreground h-7 min-w-[30px] border-0 bg-transparent px-2 text-[10px] font-medium shadow-none"
                    onClick={() => chartViewControlsRef.current?.autoScale()}
                  >
                    Auto
                  </Button>
                  <div className="relative">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className={[
                        "h-7 min-w-[30px] border-0 bg-transparent px-2",
                        "text-[10px] font-medium shadow-none",
                        "hover:bg-muted/70 hover:text-foreground",
                        goToOpen ? "bg-muted/70 text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                      aria-label="Go to chart time"
                      aria-expanded={goToOpen}
                      aria-haspopup="dialog"
                      title="Go to chart time"
                      onClick={() => setGoToOpen((value) => !value)}
                    >
                      Go To
                    </Button>

                    {goToOpen ? (
                      <div className="border-border/70 bg-card absolute right-0 top-full z-[200] mt-2 w-64 rounded-lg border p-3 shadow-xl">
                        <div className="text-foreground mb-2 text-[11px] font-semibold">
                          Go to chart time
                        </div>

                        <input
                          type="datetime-local"
                          value={goToDateTime}
                          onChange={(event) => setGoToDateTime(event.target.value)}
                          aria-label="Chart date and time"
                          data-testid="chart-go-to-input"
                          className="bg-background focus:ring-primary h-8 w-full rounded-md border px-2 text-xs outline-none focus:ring-1"
                        />

                        <div className="mt-2 flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px]"
                            onClick={() => {
                              setGoToOpen(false);
                              setGoToDateTime("");
                            }}
                          >
                            Cancel
                          </Button>

                          <Button
                            type="button"
                            size="sm"
                            className="h-7 px-3 text-[10px]"
                            disabled={!goToDateTime}
                            onClick={handleGoToChartTime}
                          >
                            Go To
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/70 hover:text-foreground h-7 w-7 border-0 bg-transparent p-0 shadow-none"
                    onClick={toggleChartFullscreen}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                    title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="hover:bg-muted/70 hover:text-foreground h-7 w-7 border-0 bg-transparent p-0 shadow-none"
                    onClick={() => chartViewControlsRef.current?.takeSnapshot()}
                    aria-label="Snap"
                    title="Snap"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* CHART WORKSPACE */}
            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* CHART */}
              <div
                ref={chartWorkspaceRef}
                className="border-border/70 bg-background relative min-h-0 min-w-0 flex-1 overflow-hidden rounded-md border"
              >
                {candlesQuery.isLoading ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                    Loading market data…
                  </div>
                ) : candles.length === 0 ? (
                  <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                    No candle data available.
                  </div>
                ) : (
                  <RMSMCandlestickChart
                    ref={chartViewControlsRef}
                    candles={candles}
                    liveCandle={liveCandle}
                    positions={instrumentPositions}
                    orders={(ordersQuery.data ?? []).filter(
                      (order) => order.instrumentId === instrumentId && order.status === "PENDING",
                    )}
                    currentPrice={
                      liveQuote?.lastPrice != null
                        ? Number(liveQuote.lastPrice)
                        : liveQuote?.bidPrice != null && liveQuote?.askPrice != null
                          ? (Number(liveQuote.bidPrice) + Number(liveQuote.askPrice)) / 2
                          : null
                    }
                    onPositionRiskChange={(positionId, risk) =>
                      updatePositionRisk.mutate({
                        positionId,
                        stopLossPrice: risk.stopLossPrice,
                        takeProfitPrice: risk.takeProfitPrice,
                      })
                    }
                    onPositionClose={(positionId) =>
                      tradingActions.closePosition.mutate(positionId)
                    }
                    onPendingOrderCancel={(orderId) => tradingActions.cancelOrder.mutate(orderId)}
                    onPendingOrderPriceChange={(orderId, price) =>
                      tradingActions.updatePendingOrder.mutate({
                        orderId,
                        price: String(price),
                      })
                    }
                    onChartLimitOrder={(type, side, price, orderQty) =>
                      paperOrder.mutate({
                        instrumentId,
                        side,
                        quantity: orderQty,
                        type,
                        ...(type === "LIMIT"
                          ? { limitPrice: String(price) }
                          : { stopPrice: String(price) }),
                      })
                    }
                    interval={interval}
                    onRequestOlder={requestOlderCandles}
                    timezone="UTC"
                    pricePrecision={pricePrecision}
                    priceMinMove={normalizedMinMove}
                    chartSettings={chartSettings}
                    indicators={indicators}
                    activeDrawingTool={drawingState.activeTool}
                    drawingState={drawingState}
                    onDrawingStateChange={handleDrawingStateChange}
                  />
                )}
              </div>
            </div>

            {/* BOTTOM ACTIVITY */}
            <div className="min-h-0 shrink-0">
              <TradingBottomDock
                accounts={demoAccounts}
                account={selectedAccount}
                accountId={accountId}
                positions={positionsQuery.data ?? []}
                orders={(ordersQuery.data ?? []).filter((order) => order.status === "PENDING")}
                trades={tradesQuery.data ?? []}
                currentPrices={currentPrices}
                instruments={tradingInstruments}
                onAccountChange={setAccountId}
                activeTab={tradingDockTab}
                onTabChange={setTradingDockTab}
                isLoading={
                  accountsQuery.isLoading ||
                  positionsQuery.isLoading ||
                  ordersQuery.isLoading ||
                  tradesQuery.isLoading
                }
                disabled={
                  accountsQuery.isError ||
                  positionsQuery.isError ||
                  ordersQuery.isError ||
                  tradesQuery.isError
                }
                onCancelAllOrders={() => tradingActions.cancelAllOrders.mutate()}
                onCancelOrder={(orderId) => tradingActions.cancelOrder.mutate(orderId)}
                onPositionRiskChange={(positionId, risk) =>
                  updatePositionRisk.mutate({
                    positionId,
                    stopLossPrice: risk.stopLossPrice,
                    takeProfitPrice: risk.takeProfitPrice,
                  })
                }
                onClosePosition={(positionId) => tradingActions.closePosition.mutate(positionId)}
                onReversePosition={(positionId) =>
                  tradingActions.reversePosition.mutate(positionId)
                }
                onFlattenAllPositions={() => tradingActions.flattenAllPositions.mutate()}
                isTradingActionPending={tradingActions.isPending || updatePositionRisk.isPending}
              />
            </div>
          </main>

          {/* DOM / ORDER PANEL */}
          <div className="hidden h-full w-[280px] min-w-0 shrink-0 overflow-hidden xl:flex">
            <TradingRightPanel
              mode={tradingMode}
              onModeChange={setTradingMode}
              account={selectedAccount}
              symbol={instrument?.symbol ?? "NAS100"}
              instrumentName={instrument?.name ?? instrument?.symbol ?? "NAS100"}
              tickSize={instrument?.tickSize}
              bidPrice={liveQuote?.bidPrice}
              askPrice={liveQuote?.askPrice}
              depth={liveDepth}
              quantity={quantity}
              onQuantityChange={setQuantity}
              onSubmit={(side) => {
                void submitMarketOrder(side);
              }}
              orderType={orderType}
              onOrderTypeChange={setOrderType}
              orderQuantity={orderQuantity}
              onOrderQuantityChange={setOrderQuantity}
              orderLimitPrice={orderLimitPrice}
              onOrderLimitPriceChange={setOrderLimitPrice}
              orderStopPrice={orderStopPrice}
              onOrderStopPriceChange={setOrderStopPrice}
              onOrderSubmit={(side, stopLossPrice, takeProfitPrice) => {
                void submitOrder(side, stopLossPrice, takeProfitPrice);
              }}
              onCreateDemoAccount={() => undefined}
              isPending={paperOrder.isPending}
              errorMessage={paperOrder.error instanceof Error ? paperOrder.error.message : null}
              currentPosition={currentInstrumentPosition}
              onClosePosition={(positionId) => tradingActions.closePosition.mutate(positionId)}
              onReversePosition={(positionId) => tradingActions.reversePosition.mutate(positionId)}
              onCancelAllOrders={() => tradingActions.cancelAllOrders.mutate()}
              onFlattenAllPositions={() => tradingActions.flattenAllPositions.mutate()}
              isTradingActionPending={tradingActions.isPending || updatePositionRisk.isPending}
            />
          </div>
        </div>
      </div>
    </>
  );
}
