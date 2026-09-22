"use client";

import { cn } from "@/lib/utils";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type IChartApi,
  IPriceLine,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type MouseEventParams,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import type { Candle, CandleInterval, Quote } from "../types";
import type { TradingOrder, TradingPosition } from "@/features/trading/types";
import type { IndicatorConfig } from "../indicators/config";
import {
  DEFAULT_MARKET_CHART_SETTINGS,
  type MarketChartSettings,
} from "../chart-settings";
import type {
  Drawing,
  DrawingPoint,
  DrawingState,
  DrawingType,
} from "../drawings/types";
import {
  DRAWING_TOOL_DEFINITIONS,
} from "../drawings/registry";
import {
  FAVORITES_CHANGED_EVENT,
  getFavoriteDrawingTools,
  setFavoriteDrawingTools,
} from "../drawings/favorites";
import {
  ArrowUpRight,
  CandlestickChart,
  ArrowDown,
  ArrowUp,
  ChartNoAxesCombined,
  CircleDot,
  Copy,
  Crosshair,
  Circle,
  Eye,
  EyeOff,
  Lock,
  Settings,
  Trash2,
  Unlock,
  DraftingCompass,
  GitBranch,
  Minus,
  MoveUpRight,
  MoveVertical,
  MessageSquare,
  MousePointer2,
  PenTool,
  Ruler,
  Square,
  Star,
  Tag,
  Triangle,
  Type,
  TrendingUp,
} from "lucide-react";
import {
  bringDrawingToFront,
  createDrawingState,
  duplicateDrawing,
  removeDrawing,
  sendDrawingToBack,
  setDrawingLocked,
  setDrawingVisibility,
  updateDrawing,
} from "../drawings/state";
import {
  addDrawingInteractionPoint,
  applyDrawingEdit,
  applyDrawingKeyboardAction,
  hitTestDrawings,
  resolveDrawingInteractionTarget,
  screenPointToDrawingPoint,
  type DrawingEditTarget,
} from "../drawings/drawing-engine";
import { DrawingRenderer } from "../drawings/drawing-renderer";
import { MarketFavoriteToolsToolbar } from "./market-favorite-tools-toolbar";
import { ToolIcon } from "./market-drawing-tools-menu";
import {
  deleteDrawingTemplate,
  getDrawingTemplates,
  TEMPLATES_CHANGED_EVENT,
  type DrawingTemplate,
  saveDrawingTemplate,
} from "../drawings/templates";
import { MarketChartViewControls } from "./market-chart-view-controls";
import {
  calculateADX,
  calculateATR,
  calculateBollingerBands,
  calculateCCI,
  calculateEMA,
  calculateMACD,
  calculateOBV,
  calculateROC,
  calculateRSI,
  calculateSMA,
  calculateStochastic,
  calculateVolume,
  calculateVWAP,
  calculateVWMA,
  calculateWMA,
  calculateWilliamsR,
  type IndicatorCandle,
} from "../indicators/technical-indicators";

export interface RMSMCandlestickChartHandle {
  fitContent: () => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  autoScale: () => void;
  goToTime: (time: number) => void;
  takeSnapshot: () => void;
}

interface RMSMCandlestickChartProps {
  embedControls?: boolean;
  candles: Candle[];
  height?: number;
  replayCursor?: number | null;
  replayEnabled?: boolean;
  backtestMarkers?: BacktestChartMarker[];
  indicators?: IndicatorConfig[];
  liveQuote?: Quote | null;
  liveCandle?: Candle | null;

  positions?: TradingPosition[];
  pendingOrders?: Array<{
    orderId: string;
    side: "BUY" | "SELL";
    type: "LIMIT" | "STOP";
    quantity?: string | number | null;
    limitPrice?: string | number | null;
    stopPrice?: string | number | null;
    stopLossPrice?: string | number | null;
    takeProfitPrice?: string | number | null;
  }>;

  orders?: TradingOrder[];
  currentPrice?: number | null;

  takeProfitPrice?: number | null;
  stopLossPrice?: number | null;

  onPositionRiskChange?: (
    positionId: string,
    risk: {
      stopLossPrice: string | null;
      takeProfitPrice: string | null;
    },
  ) => void;
  onPositionClose?: (positionId: string) => void;
  onPendingOrderCancel?: (orderId: string) => void;
  onPendingOrderPriceChange?: (
    orderId: string,
    price: number,
  ) => void;
  interval?: CandleInterval;
  timezone?: string;
  pricePrecision?: number;
  priceMinMove?: number;
  onRequestOlder?: () => void;
  chartSettings?: MarketChartSettings;
  activeDrawingTool?: DrawingType;
  drawingState?: DrawingState;
  hideInternalDrawingTools?: boolean;
  onDrawingStateChange?: (state: DrawingState) => void;
  onChartLimitOrder?: (
    type: "LIMIT" | "STOP",
    side: "BUY" | "SELL",
    price: number,
    quantity: string,
  ) => void;
  onChartSettingsOpen?: () => void;
  templatesOpen?: boolean;
  onTemplatesOpenChange?: (open: boolean) => void;
}

interface BacktestChartMarker {
  time: string | Date;
  price?: number;
  side: "LONG" | "SHORT";
  event: "ENTRY" | "EXIT";
  label?: string;
}

interface OverlaySeries {
  configId: string;
  series: ISeriesApi<"Line">[];
}

type PositionRiskLineKind =
  | "STOP_LOSS"
  | "TAKE_PROFIT";

interface PositionRiskLineRuntime {
  positionId: string;
  kind: PositionRiskLineKind;
  price: number;
  line: ReturnType<
    ISeriesApi<"Candlestick">["createPriceLine"]
  >;
}

interface PositionRiskDrag {
  positionId: string;
  kind: PositionRiskLineKind;
  originalStopLossPrice: string | null;
  originalTakeProfitPrice: string | null;
  price: number;
  dragging: boolean;
}

const EMPTY_INDICATORS: IndicatorConfig[] = [];

const DRAWING_TOOL_ICONS: Record<
  DrawingType,
  typeof MousePointer2
> = {
  SELECT: MousePointer2,

  TREND_LINE: TrendingUp,
  HORIZONTAL_LINE: Minus,
  VERTICAL_LINE: MoveVertical,
  RAY: MoveUpRight,
  EXTENDED_LINE: MoveUpRight,
  CROSS_LINE: Crosshair,
  ARROW: ArrowUpRight,

  RECTANGLE: Square,
  CIRCLE: Circle,
  TRIANGLE: Triangle,
  WEDGE: DraftingCompass,
  POLYLINE: PenTool,

  TEXT: Type,
  NOTE: MessageSquare,
  CALLOUT: MessageSquare,
  PRICE_LABEL: Tag,

  PARALLEL_CHANNEL: GitBranch,
  PRICE_CHANNEL: DraftingCompass,
  REGRESSION_CHANNEL: ChartNoAxesCombined,

  FIB_RETRACEMENT: PenTool,
  FIB_EXTENSION: Crosshair,
  FIB_PROJECTION: MoveUpRight,
  FIB_TIME: CircleDot,
  FIB_CHANNEL: GitBranch,

  ABCD: GitBranch,
  XABCD: Crosshair,
  HEAD_SHOULDERS: ChartNoAxesCombined,

  FORECAST: TrendingUp,
  PROJECTION: ArrowUpRight,

  MEASURE_PRICE: Ruler,
  MEASURE_TIME: MoveVertical,
  MEASURE_PRICE_TIME: MoveUpRight,
  MEASURE_RANGE: Ruler,
  LONG_POSITION: CandlestickChart,
  SHORT_POSITION: CandlestickChart,
};

interface DrawingToolGroup {
  id: string;
  label: string;
  types: DrawingType[];
}

const DRAWING_TOOL_GROUPS: readonly DrawingToolGroup[] = [
  {
    id: "lines",
    label: "Lines",
    types: [
      "TREND_LINE",
      "HORIZONTAL_LINE",
      "VERTICAL_LINE",
      "RAY",
      "ARROW",

      "EXTENDED_LINE",
      "CROSS_LINE",],
  },
  {
    id: "channels",
    label: "Channels",
    types: [
      "PARALLEL_CHANNEL",
      "PRICE_CHANNEL",
      "REGRESSION_CHANNEL",
    ],
  },
  {
    id: "fibonacci",
    label: "Fibonacci",
    types: [
      "FIB_RETRACEMENT",
      "FIB_EXTENSION",
      "FIB_PROJECTION",
      "FIB_TIME",

      "FIB_CHANNEL",],
  },
  {
    id: "shapes",
    label: "Shapes",
    types: [
      "RECTANGLE",
      "TRIANGLE",
      "WEDGE",

      "CIRCLE",
      "POLYLINE",],
  },
  {
    id: "patterns",
    label: "Patterns",
    types: [
      "ABCD",
      "XABCD",
      "HEAD_SHOULDERS",
    ],
  },
  {
    id: "forecast",
    label: "Forecast / Projection",
    types: [
      "FORECAST",
      "PROJECTION",
    ],
  },
  {
    id: "measurement",
    label: "Measurement",
    types: [
      "MEASURE_PRICE",
      "MEASURE_TIME",
      "MEASURE_PRICE_TIME",
      "MEASURE_RANGE",

      "LONG_POSITION",
      "SHORT_POSITION",],
  },
  {
    id: "text",
    label: "Text",
    types: [
      "TEXT",

      "NOTE",
      "CALLOUT",
      "PRICE_LABEL",],
  },
];

function DrawingToolbox({
  activeTool,
  onSelect,
  selectedTemplate,
  onSelectTemplate,
  templatesOpen,
  onTemplatesOpenChange,
}: {
  activeTool: DrawingType;
  onSelect: (tool: DrawingType) => void;
  selectedTemplate: DrawingTemplate | null;
  onSelectTemplate: (template: DrawingTemplate | null) => void;
  templatesOpen: boolean;
  onTemplatesOpenChange: (open: boolean) => void;
}) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [favoriteTools, setFavoriteTools] = useState<DrawingType[]>([]);
  const [templates, setTemplates] = useState<DrawingTemplate[]>([]);

  useEffect(() => {
    setTemplates(getDrawingTemplates());

    const handleTemplatesChanged = () => {
      setTemplates(getDrawingTemplates());
    };

    window.addEventListener(
      TEMPLATES_CHANGED_EVENT,
      handleTemplatesChanged,
    );

    return () => {
      window.removeEventListener(
        TEMPLATES_CHANGED_EVENT,
        handleTemplatesChanged,
      );
    };
  }, []);

  useEffect(() => {
    setFavoriteTools(getFavoriteDrawingTools());

    const handleFavoritesChanged = () => {
      setFavoriteTools(getFavoriteDrawingTools());
    };

    window.addEventListener(
      FAVORITES_CHANGED_EVENT,
      handleFavoritesChanged,
    );

    return () => {
      window.removeEventListener(
        FAVORITES_CHANGED_EVENT,
        handleFavoritesChanged,
      );
    };
  }, []);

  const toggleFavorite = (event: React.MouseEvent, type: DrawingType) => {
    event.preventDefault();
    event.stopPropagation();

    const nextFavorites = favoriteTools.includes(type)
      ? favoriteTools.filter((item) => item !== type)
      : [...favoriteTools, type];

    setFavoriteDrawingTools(nextFavorites);
    setFavoriteTools(nextFavorites);
  };

  const activeDefinition = DRAWING_TOOL_DEFINITIONS.find(
    (definition) => definition.type === activeTool,
  );

  const ActiveIcon =
    DRAWING_TOOL_ICONS[activeTool] ?? PenTool;

  return (
    <div
      className="absolute left-2 top-12 z-[100] flex flex-col rounded-lg border border-border/60 bg-card/90 p-1 shadow-lg backdrop-blur-md"
      data-testid="market-drawing-toolbox"
    >
      <button
        type="button"
        className={[
          "flex h-8 w-8 items-center justify-center rounded-md",
          "text-muted-foreground transition-colors",

          "transition-colors hover:bg-accent hover:text-accent-foreground",
          activeTool === "SELECT"
            ? "bg-primary/12 text-primary"
            : "",
        ].join(" ")}
        aria-label="Select drawing"
        title="Select"
        onClick={() => {
          setOpenGroup(null);
          onSelect("SELECT");
        }}
      >
        <MousePointer2 className="h-4 w-4" />
      </button>

      <div className="my-1 h-px bg-border/70" />

      {DRAWING_TOOL_GROUPS.map((group) => {
        const GroupIcon =
          DRAWING_TOOL_ICONS[group.types[0]!] ?? PenTool;

        const groupActive = group.types.includes(activeTool);
        const groupOpen = openGroup === group.id;

        return (
          <div
            key={group.id}
            className="relative"
            onMouseEnter={() => setOpenGroup(group.id)}
            onMouseLeave={() => setOpenGroup(null)}
          >
            <button
              type="button"
              className={[
                "flex h-8 w-8 items-center justify-center rounded-md",
          "text-muted-foreground transition-colors",

                "transition-colors hover:bg-accent hover:text-accent-foreground",
                groupActive
                  ? "bg-primary/12 text-primary"
                  : "",
                groupOpen
                  ? "bg-muted/80 text-foreground"
                  : "",
              ].join(" ")}
              aria-label={group.label}
              title={group.label}
              onClick={() => {
                const first = group.types[0];

                if (first) {
                  onSelect(first);
                }

                setOpenGroup(group.id);
              }}
            >
              <GroupIcon className="h-4 w-4" />
            </button>

            {groupOpen && (
              <div
                className="absolute left-full top-0 z-[110] ml-2 w-56 rounded-lg border border-border/60 bg-card/95 p-1.5 shadow-xl backdrop-blur-md"
                role="menu"
                aria-label={group.label}
              >
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  {group.label}
                </div>

                <div className="h-px bg-border/70" />

                {group.types.map((type) => {
                  const definition =
                    DRAWING_TOOL_DEFINITIONS.find(
                      (item) => item.type === type,
                    );

                  if (!definition) {
                    return null;
                  }

                  const Icon =
                    DRAWING_TOOL_ICONS[type] ?? PenTool;

                  const active = activeTool === type;

                  const favorite = favoriteTools.includes(type);

                  return (
                    <div
                      key={type}
                      className={[
                        "flex w-full items-center rounded-md",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className={[
                          "flex min-w-0 flex-1 items-center gap-2 rounded-l-md px-2 py-1.5",
                          "text-left text-sm transition-colors",
                          "hover:bg-accent hover:text-accent-foreground",
                        ].join(" ")}
                        onClick={() => {
                          onSelect(type);
                          setOpenGroup(group.id);
                        }}
                      >
                        <Icon className="h-4 w-4 shrink-0" />

                        <span className="truncate">
                          {definition.label}
                        </span>

                        {active && (
                          <span className="ml-auto text-xs">
                            ✓
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        aria-label={
                          favorite
                            ? `Remove ${definition.label} from favourites`
                            : `Add ${definition.label} to favourites`
                        }
                        title={
                          favorite
                            ? "Remove from favourites"
                            : "Add to favourites"
                        }
                        className={[
                          "mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded",
                          "text-foreground/60",
                          "hover:bg-accent hover:text-foreground",
                          favorite ? "text-foreground" : "",
                        ].join(" ")}
                        onPointerDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) =>
                          toggleFavorite(event, type)
                        }
                      >
                        <Star
                          className="h-3.5 w-3.5"
                          fill={
                            favorite
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <div className="my-1 h-px bg-border/70" />

      <div
        className="relative"
        onMouseEnter={() => onTemplatesOpenChange(true)}
        onMouseLeave={() => onTemplatesOpenChange(false)}
      >
        <button
          type="button"
          className={[
            "flex h-8 w-8 items-center justify-center rounded-md",
            "transition-colors hover:bg-accent hover:text-accent-foreground",
            selectedTemplate
              ? "bg-accent text-accent-foreground"
              : "",
          ].join(" ")}
          aria-label="Drawing templates"
          title={
            selectedTemplate
              ? `Template: ${selectedTemplate.name}`
              : "Drawing templates"
          }
          onClick={() => onTemplatesOpenChange(!templatesOpen)}
        >
          <Copy className="h-4 w-4" />
        </button>

        {templatesOpen && (
          <div
            className="absolute bottom-0 left-full z-[110] ml-2 w-64 rounded-lg border border-border/60 bg-card/95 p-1.5 shadow-xl backdrop-blur-md"
            role="menu"
            aria-label="Drawing templates"
          >
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Drawing Templates
            </div>

            <div className="h-px bg-border/70" />

            {templates.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No templates saved.
                <br />
                Right-click a drawing to save one.
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={[
                    "flex items-center rounded-md",
                    selectedTemplate?.id === template.id
                      ? "bg-accent text-accent-foreground"
                      : "",
                  ].join(" ")}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    title={`${template.name} — ${template.type}`}
                    onClick={() => {
                      onSelect(template.type);
                      onSelectTemplate(template);
                      onTemplatesOpenChange(false);
                    }}
                  >
                    <ToolIcon
                      type={template.type}
                      className="h-4 w-4 shrink-0"
                    />

                    <span className="truncate">
                      {template.name}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-destructive"
                    aria-label={`Delete ${template.name}`}
                    title="Delete template"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      deleteDrawingTemplate(template.id);

                      if (
                        selectedTemplate?.id ===
                        template.id
                      ) {
                        onSelectTemplate(null);
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div
        className="relative"
        title={
          selectedTemplate
            ? `Using template: ${selectedTemplate.name}`
            : "No drawing template selected"
        }
      >
        {selectedTemplate && (
          <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary" />
        )}
      </div>

      <div
        className="flex h-7 w-8 items-center justify-center"
        title={
          activeTool === "SELECT"
            ? "Drawing tools"
            : activeDefinition?.label ?? "Drawing tools"
        }
      >
        <ActiveIcon className="h-3.5 w-3.5 opacity-40" />
      </div>
    </div>
  );
}

interface DrawingPointerInteraction {
  target: DrawingEditTarget;
  startX: number;
  startY: number;
  baseState: DrawingState;
  dragging: boolean;
}

const EMPTY_POSITIONS: RMSMCandlestickChartProps["positions"] = [];

function formatCrosshairTime(
  time: number,
  timezone: string,
): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(time * 1000));
  } catch {
    return new Date(time * 1000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
  }
}

function formatCrosshairPrice(
  price: number,
  precision: number,
): string {
  return price.toFixed(precision);
}

export const RMSMCandlestickChart = forwardRef<
  RMSMCandlestickChartHandle,
  RMSMCandlestickChartProps
>(function RMSMCandlestickChart({
  candles,
  height,
  replayCursor = null,
  replayEnabled = false,
  backtestMarkers = [],
  indicators = EMPTY_INDICATORS,
  liveCandle = null,
  positions = EMPTY_POSITIONS,
  orders = [],
  currentPrice = null,
  takeProfitPrice = null,
  stopLossPrice = null,
  onPositionRiskChange,
  onPositionClose,
  timezone = "Etc/UTC",
  pricePrecision = 2,
  priceMinMove = 0.01,
  onRequestOlder,
  embedControls,
  chartSettings = DEFAULT_MARKET_CHART_SETTINGS,
  activeDrawingTool = "SELECT",
  drawingState: controlledDrawingState,
  hideInternalDrawingTools = false,
  onDrawingStateChange,
  onPendingOrderCancel,
  onPendingOrderPriceChange,
  onChartLimitOrder,
  onChartSettingsOpen,
  templatesOpen = false,
  onTemplatesOpenChange = () => {},
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [, setChartReadyRevision] = useState(0);

  const takeProfitLineRef = useRef<IPriceLine | null>(null);
  const stopLossLineRef = useRef<IPriceLine | null>(null);
  const positionEntryLinesRef = useRef<IPriceLine[]>([]);
  const pendingOrderLinesRef = useRef<IPriceLine[]>([]);
  const overlaySeriesRef = useRef<OverlaySeries[]>([]);

  const backtestMarkersRef = useRef<
    ISeriesMarkersPluginApi<Time> | null
  >(null);

  const positionPriceLinesRef = useRef<
    Array<ReturnType<ISeriesApi<"Candlestick">["createPriceLine"]>>
  >([]);

  type PendingOrderLineRuntime = {
    orderId: string;
    price: number;
    line: ReturnType<
      ISeriesApi<"Candlestick">["createPriceLine"]
    >;
  };

  const orderPriceLinesRef = useRef<
    PendingOrderLineRuntime[]
  >([]);

  const pendingOrderDragRef = useRef<{
    orderId: string;
    price: number;
  } | null>(null);

  const positionRiskLinesRef = useRef<
    PositionRiskLineRuntime[]
  >([]);

  const positionRiskDragRef =
    useRef<PositionRiskDrag | null>(null);

  type IndicatorPaneRuntime = {
    pane: ReturnType<IChartApi["addPane"]>;
    series: ISeriesApi<"Line" | "Histogram">[];
  };

  const indicatorPanesRef = useRef<
    Map<string, IndicatorPaneRuntime>
  >(new Map());

  const onRequestOlderRef = useRef(onRequestOlder);
  const onPositionRiskChangeRef =
    useRef(onPositionRiskChange);
  const onPositionCloseRef =
    useRef(onPositionClose);

  const onPendingOrderCancelRef =
    useRef(onPendingOrderCancel);

  const onPendingOrderPriceChangeRef =
    useRef(onPendingOrderPriceChange);

  const positionsRef = useRef<TradingPosition[]>(
    positions,
  );
  positionsRef.current = positions;

  onPositionRiskChangeRef.current =
    onPositionRiskChange;

  onPositionCloseRef.current =
    onPositionClose;

  onPendingOrderCancelRef.current =
    onPendingOrderCancel;

  onPendingOrderPriceChangeRef.current =
    onPendingOrderPriceChange;

  const previousCandleCountRef = useRef(0);
  const initialDataLoadedRef = useRef(false);
  const candleTimesRef = useRef<number[]>([]);

  // Tracks the latest candle actually rendered into Lightweight Charts.
  // This prevents stale live updates from moving the series backwards.
  const latestRenderedCandleRef = useRef<number | null>(null);

  const [internalDrawingState, setInternalDrawingState] =
    useState(() =>
      createDrawingState(activeDrawingTool),
    );

  const [selectedDrawingTemplate, setSelectedDrawingTemplate] =
    useState<DrawingTemplate | null>(null);

  const [cursorPosition, setCursorPosition] = useState<{
    x: number;
    y: number;
    time: number;
    price: number;
    open: number;
    high: number;
    low: number;
    close: number;
  } | null>(null);

    const [
    pendingOrderDragPreview,
    setPendingOrderDragPreview,
  ] = useState<{
    orderId: string;
    price: number;
  } | null>(null);

const [positionPnl, setPositionPnl] = useState<{
    positionId: string;
    side: TradingPosition["side"];
    quantity: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercent: number;
    y: number;
  } | null>(null);

  const [positionRiskPreview, setPositionRiskPreview] =
    useState<{
      positionId: string;
      kind: PositionRiskLineKind;
      price: number;
      pnl: number;
      pnlPercent: number;
      y: number;
    } | null>(null);

  const [
    navigationControlsVisible,
    setNavigationControlsVisible,
  ] = useState(false);

  const drawingState =
    controlledDrawingState ?? internalDrawingState;

  const drawingStateRef = useRef(drawingState);
  drawingStateRef.current = drawingState;

  const setDrawingState = (
    nextState:
      | DrawingState
      | ((state: DrawingState) => DrawingState),
  ) => {
    if (controlledDrawingState === undefined) {
      setInternalDrawingState(nextState);
      return;
    }

    const current =
      drawingStateRef.current;

    const resolved =
      typeof nextState === "function"
        ? nextState(current)
        : nextState;

    onDrawingStateChange?.(resolved);
  };
  const [, setPendingDrawingPoints] = useState<DrawingPoint[]>([]);

  const pendingDrawingPointsRef = useRef<DrawingPoint[]>([]);
  const onDrawingStateChangeRef = useRef(onDrawingStateChange);

  const drawingPointerInteractionRef =
    useRef<DrawingPointerInteraction | null>(null);

  const suppressDrawingClickRef = useRef(false);

  const [drawingContextMenu, setDrawingContextMenu] =
    useState<{
      x: number;
      y: number;
      drawingId: string;
    } | null>(null);

  const [chartContextMenu, setChartContextMenu] =
    useState<{
      x: number;
      y: number;
      price: number | null;
    } | null>(null);

  const [chartContextQuantity, setChartContextQuantity] =
    useState("1");

  const [drawingSettingsOpen, setDrawingSettingsOpen] =
    useState(false);

  const closeDrawingContextMenu = () => {
    setDrawingContextMenu(null);
    setDrawingSettingsOpen(false);
  };

  const closeChartContextMenu = () => {
    setChartContextMenu(null);
    setChartContextQuantity("1");
  };

  const timeToDrawingX = (
    time: number,
  ): number | null => {
    const chart = chartRef.current;

    if (!chart || !Number.isFinite(time)) {
      return null;
    }

    const timeScale = chart.timeScale();

    const exact = timeScale.timeToCoordinate(
      time as Time,
    );

    if (exact != null) {
      return exact;
    }

    const candleTimes = candleTimesRef.current;

    if (candleTimes.length === 0) {
      return null;
    }

    let nearest = candleTimes[0]!;
    let nearestDistance = Math.abs(
      nearest - time,
    );

    for (const candleTime of candleTimes) {
      const distance = Math.abs(
        candleTime - time,
      );

      if (distance < nearestDistance) {
        nearest = candleTime;
        nearestDistance = distance;
      }
    }

    return timeScale.timeToCoordinate(
      nearest as Time,
    );
  };

  const fitContent = () => {
    chartRef.current?.timeScale().fitContent();
  };

  const resetView = () => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    chart.timeScale().fitContent();
    chart.priceScale("right").applyOptions({
      autoScale: true,
    });
  };

  const zoomIn = () => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    const range = chart.timeScale().getVisibleLogicalRange();

    if (!range) {
      return;
    }

    const center = (range.from + range.to) / 2;
    const halfWidth = Math.max((range.to - range.from) * 0.4, 5);

    chart.timeScale().setVisibleLogicalRange({
      from: center - halfWidth,
      to: center + halfWidth,
    });
  };

  const zoomOut = () => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    const range = chart.timeScale().getVisibleLogicalRange();

    if (!range) {
      return;
    }

    const center = (range.from + range.to) / 2;
    const halfWidth = Math.max((range.to - range.from) * 0.625, 5);

    chart.timeScale().setVisibleLogicalRange({
      from: center - halfWidth,
      to: center + halfWidth,
    });
  };

  const scrollLeft = () => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    const range = chart.timeScale().getVisibleLogicalRange();

    if (!range) {
      return;
    }

    const shift = Math.max(
      (range.to - range.from) * 0.25,
      1,
    );

    chart.timeScale().setVisibleLogicalRange({
      from: range.from - shift,
      to: range.to - shift,
    });
  };

  const scrollRight = () => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    const range = chart.timeScale().getVisibleLogicalRange();

    if (!range) {
      return;
    }

    const shift = Math.max(
      (range.to - range.from) * 0.25,
      1,
    );

    chart.timeScale().setVisibleLogicalRange({
      from: range.from + shift,
      to: range.to + shift,
    });
  };

  const autoScale = () => {
    chartRef.current?.priceScale("right").applyOptions({
      autoScale: true,
    });
  };

  const goToTime = (time: number) => {
    const chart = chartRef.current;

    if (!chart || !Number.isFinite(time)) {
      return;
    }

    const candleTimes = candleTimesRef.current;

    if (candleTimes.length === 0) {
      return;
    }

    let nearestIndex = 0;
    let nearestDistance = Math.abs(candleTimes[0]! - time);

    for (let index = 1; index < candleTimes.length; index += 1) {
      const distance = Math.abs(candleTimes[index]! - time);

      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    }

    const timeScale = chart.timeScale();
    const currentRange = timeScale.getVisibleLogicalRange();

    const visibleWidth = currentRange
      ? Math.max(currentRange.to - currentRange.from, 20)
      : 100;

    const halfWidth = visibleWidth / 2;

    timeScale.setVisibleLogicalRange({
      from: nearestIndex - halfWidth,
      to: nearestIndex + halfWidth,
    });
  };

  useImperativeHandle(
    ref,
    () => ({
      fitContent,
      resetView,
      zoomIn,
      zoomOut,
      scrollLeft,
      scrollRight,
      autoScale,
      goToTime,
      takeSnapshot: () => {
        const chart = chartRef.current;

        if (!chart) {
          return;
        }

        const canvas = chart.takeScreenshot();

        canvas.toBlob((blob) => {
          if (!blob) {
            return;
          }

          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");

          anchor.href = url;
          anchor.download = "rmsm-chart.png";
          anchor.click();

          URL.revokeObjectURL(url);
        }, "image/png");
      },
    }),
    [],
  );

  const updateSelectedDrawing = (
    patch: Partial<Drawing>,
  ) => {
    const id = drawingContextMenu?.drawingId;

    if (!id) {
      return;
    }

    const nextState = updateDrawing(
      drawingStateRef.current,
      id,
      patch,
    );

    drawingStateRef.current = nextState;
    setDrawingState(nextState);
    onDrawingStateChangeRef.current?.(nextState);
  };

  const updateSelectedDrawingStyle = (
    patch: Partial<Drawing["style"]>,
  ) => {
    const id = drawingContextMenu?.drawingId;

    if (!id) {
      return;
    }

    const drawing = drawingStateRef.current.drawings.find(
      (candidate) => candidate.id === id,
    );

    if (!drawing) {
      return;
    }

    updateSelectedDrawing({
      style: {
        ...drawing.style,
        ...patch,
      },
    });
  };

  const contextDrawing =
    drawingContextMenu
      ? drawingStateRef.current.drawings.find(
          (drawing) =>
            drawing.id === drawingContextMenu.drawingId,
        )
      : null;

  useEffect(() => {
    onDrawingStateChangeRef.current = onDrawingStateChange;
  }, [onDrawingStateChange]);

  useEffect(() => {
    if (controlledDrawingState === undefined) {
      setInternalDrawingState((state) => ({
        ...state,
        activeTool: activeDrawingTool,
        selectedDrawingId:
          activeDrawingTool === "SELECT"
            ? state.selectedDrawingId
            : null,
      }));
    }

    pendingDrawingPointsRef.current = [];
    setPendingDrawingPoints([]);
  }, [activeDrawingTool, controlledDrawingState]);

  useEffect(() => {
    onRequestOlderRef.current = onRequestOlder;
  }, [onRequestOlder]);

  useEffect(() => {
    const container = containerRef.current;
    const chartRoot = container?.parentElement;

    if (!container || !chartRoot) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height: height ?? container.clientHeight,
      layout: {
        background: {
          type: ColorType.Solid,
          color: "transparent",
        },
        textColor: "#94a3b8",
        attributionLogo: false,
      },
      grid: {
        vertLines: {
          color: "rgba(148, 163, 184, 0.06)",
        },
        horzLines: {
          color: "rgba(148, 163, 184, 0.06)",
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
      crosshair: {
        mode: 0,
        vertLine: {
          visible: false,
          labelVisible: false,
        },
        horzLine: {
          visible: false,
          labelVisible: false,
        },
      },
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.18)",
        scaleMargins: {
          top: 0.08,
          bottom: 0.30,
        },
        minimumWidth: 72,
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.18)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      localization: {
        timeFormatter: (time: number) => {
          const timestamp = time * 1000;

          try {
            return new Intl.DateTimeFormat("en-GB", {
              timeZone: timezone,
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }).format(new Date(timestamp));
          } catch {
            return new Date(timestamp)
              .toISOString()
              .slice(11, 16);
          }
        },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: chartSettings.candles.upColor,
      downColor: chartSettings.candles.downColor,
      borderVisible: chartSettings.candles.borderVisible,
      wickUpColor: chartSettings.candles.wickVisible
        ? chartSettings.candles.wickUpColor
        : chartSettings.candles.upColor,
      wickDownColor: chartSettings.candles.wickVisible
        ? chartSettings.candles.wickDownColor
        : chartSettings.candles.downColor,
      priceLineVisible: chartSettings.priceScale.priceLineVisible,
      lastValueVisible: chartSettings.priceScale.lastValueVisible,
      priceFormat: {
        type: "price",
        precision: pricePrecision,
        minMove: priceMinMove,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    setChartReadyRevision((value) => value + 1);

    backtestMarkersRef.current = createSeriesMarkers(
      candleSeries,
      [],
    );

    syncPositionPriceLines();

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const { width, height: containerHeight } = entry.contentRect;

      if (width > 0 && containerHeight > 0) {
        chart.applyOptions({
          width,
          height: containerHeight,
        });
      }
    });

    resizeObserver.observe(container);

    const timeScale = chart.timeScale();

    const handleVisibleLogicalRangeChange = () => {
      const logicalRange =
        timeScale.getVisibleLogicalRange();

      if (
        logicalRange &&
        logicalRange.from <= 20
      ) {
        onRequestOlderRef.current?.();
      }
    };

    timeScale.subscribeVisibleLogicalRangeChange(
      handleVisibleLogicalRangeChange,
    );

    const getDrawingHitTestContext = () => ({
      width: container.clientWidth,
      height: container.clientHeight,
      timeToX: (value: number) =>
        chart.timeScale().timeToCoordinate(value as Time),
      priceToY: (value: number) =>
        candleSeries.priceToCoordinate(value),
    });

    const getDrawingPointFromScreen = (
      x: number,
      y: number,
    ): DrawingPoint | null => {
      try {
        return screenPointToDrawingPoint(
          {
            state: drawingStateRef.current,
            ...getDrawingHitTestContext(),
            xToTime: (screenX) => {
              const value =
                chart.timeScale().coordinateToTime(screenX);

              if (value === null || value === undefined) {
                return null;
              }

              return typeof value === "number"
                ? value
                : Number(value);
            },
            yToPrice: (screenY) =>
              candleSeries.coordinateToPrice(screenY),
          },
          x,
          y,
        );
      } catch {
        return null;
      }
    };

    const emitDrawingState = (nextState: DrawingState) => {
      drawingStateRef.current = nextState;
      setDrawingState(nextState);
    };

    const handleDrawingKeyDown = (
      event: KeyboardEvent,
    ) => {
      let action:
        | "DELETE"
        | "ESCAPE"
        | "MOVE_LEFT"
        | "MOVE_RIGHT"
        | "MOVE_UP"
        | "MOVE_DOWN"
        | null = null;

      switch (event.key) {
        case "Delete":
        case "Backspace":
          action = "DELETE";
          break;
        case "Escape":
          action = "ESCAPE";
          break;
        case "ArrowLeft":
          action = "MOVE_LEFT";
          break;
        case "ArrowRight":
          action = "MOVE_RIGHT";
          break;
        case "ArrowUp":
          action = "MOVE_UP";
          break;
        case "ArrowDown":
          action = "MOVE_DOWN";
          break;
        default:
          return;
      }

      const currentState = drawingStateRef.current;

      /*
       * No selection is a true keyboard no-op.
       * This must remain distinct from a locked selection.
       */
      if (
        currentState.selectedDrawingId === null
      ) {
        return;
      }

      const selectedDrawing =
        currentState.drawings.find(
          (drawing) =>
            drawing.id === currentState.selectedDrawingId,
        );

      /*
       * Locked drawings cannot be modified, but the keyboard
       * interaction is still consumed and the controlled state
       * callback receives the unchanged state.
       */
      if (selectedDrawing?.locked) {
        event.preventDefault();
        emitDrawingState(currentState);
        return;
      }

      const nextState = applyDrawingKeyboardAction(
        currentState,
        action,
      );

      if (nextState === currentState) {
        return;
      }

      event.preventDefault();

      emitDrawingState(nextState);
    };


    const handleDrawingPointerDown = (
      event: PointerEvent,
    ) => {
      // TP/SL risk dragging owns this pointer gesture.
      if (positionRiskDragRef.current?.dragging) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (
        x < 0 ||
        y < 0 ||
        x > rect.width ||
        y > rect.height
      ) {
        return;
      }

      /*
       * Pending-order dragging has priority over drawing selection.
       * The hit test is performed against the actual chart price
       * coordinate, so the complete horizontal order line is draggable.
       */
      if (drawingStateRef.current.activeTool === "SELECT") {
        const targetElement =
          event.target instanceof HTMLElement
            ? event.target
            : null;

        if (targetElement?.closest("button")) {
          return;
        }

        const pendingHitTolerance = 10;

        let nearestOrder:
          | {
              id: string;
              price: number;
              distance: number;
            }
          | null = null;

        for (const order of orders) {
          if (order.status !== "PENDING") {
            continue;
          }

          const rawPrice =
            order.type === "LIMIT"
              ? order.limitPrice
              : order.stopPrice;

          if (rawPrice == null) {
            continue;
          }

          const price = Number(rawPrice);

          if (!Number.isFinite(price)) {
            continue;
          }

          const orderY =
            candleSeriesRef.current?.priceToCoordinate(
              price,
            );

          if (
            orderY == null ||
            !Number.isFinite(orderY)
          ) {
            continue;
          }

          const distance = Math.abs(y - orderY);

          if (
            distance <= pendingHitTolerance &&
            (
              nearestOrder === null ||
              distance < nearestOrder.distance
            )
          ) {
            nearestOrder = {
              id: order.id,
              price,
              distance,
            };
          }
        }

        if (nearestOrder) {
          pendingOrderDragRef.current = {
            orderId: nearestOrder.id,
            price: nearestOrder.price,
          };

          setPendingOrderDragPreview({
            orderId: nearestOrder.id,
            price: nearestOrder.price,
          });

          suppressDrawingClickRef.current = true;

          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();

          container.setPointerCapture?.(
            event.pointerId,
          );

          return;
        }
      }

      /*
       * Drawing tools use the native pointer event as the authoritative
       * placement event. Lightweight Charts' click event is suppressed
       * for this interaction so a single mouse click can never create
       * two points.
       */
      if (drawingStateRef.current.activeTool !== "SELECT") {
        const point = getDrawingPointFromScreen(x, y);

        if (!point) {
          return;
        }

        const result = addDrawingInteractionPoint(
          drawingStateRef.current,
          point,
          pendingDrawingPointsRef.current,
          selectedDrawingTemplate?.style,
          selectedDrawingTemplate?.content,
        );

        pendingDrawingPointsRef.current =
          result.pendingPoints;

        drawingStateRef.current = result.state;

        if (result.completed) {
          setSelectedDrawingTemplate(null);
        }

        setPendingDrawingPoints(result.pendingPoints);
        setDrawingState(result.state);

        onDrawingStateChangeRef.current?.(
          result.state,
        );

        suppressDrawingClickRef.current = true;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        return;
      }

      const target = resolveDrawingInteractionTarget(
        drawingStateRef.current,
        x,
        y,
        getDrawingHitTestContext(),
      );

      if (!target) {
        drawingPointerInteractionRef.current = null;
        return;
      }

      const nextState = {
        ...drawingStateRef.current,
        selectedDrawingId: target.drawingId,
      };

      emitDrawingState(nextState);

      // Drawing edit gestures must never start chart panning.
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const editTarget: DrawingEditTarget =
        target.kind === "HANDLE"
          ? {
              drawingId: target.drawingId,
              mode: "ENDPOINT",
              pointIndex: target.pointIndex,
            }
          : {
              drawingId: target.drawingId,
              mode: "MOVE",
            };

      drawingPointerInteractionRef.current = {
        target: editTarget,
        startX: x,
        startY: y,
        baseState: nextState,
        dragging: false,
      };

      suppressDrawingClickRef.current = false;

      container.setPointerCapture?.(event.pointerId);
    };

    const handleDrawingPointerMove = (
      event: PointerEvent,
    ) => {
      // Do not let drawing interaction compete with TP/SL drag.
      if (positionRiskDragRef.current?.dragging) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const cursorX = event.clientX - rect.left;
      const cursorY = event.clientY - rect.top;

      const navigationActivationHeight = 180;
      const navigationActivationTop = Math.max(
        0,
        rect.height - navigationActivationHeight,
      );

      const pointerNearNavigation =
        cursorY >= navigationActivationTop &&
        cursorY <= rect.height;

      setNavigationControlsVisible((visible) =>
        visible === pointerNearNavigation
          ? visible
          : pointerNearNavigation,
      );

      if (
        cursorX >= 0 &&
        cursorY >= 0 &&
        cursorX <= rect.width &&
        cursorY <= rect.height
      ) {
        const timeCoordinate =
          chartRef.current
            ?.timeScale()
            .coordinateToTime(cursorX);

        const price =
          candleSeriesRef.current?.coordinateToPrice(
            cursorY,
          );

        if (
          timeCoordinate !== undefined &&
          timeCoordinate !== null &&
          price !== null &&
          price !== undefined
        ) {
          const hoveredTime =
            typeof timeCoordinate === "number"
              ? timeCoordinate
              : Number(timeCoordinate);

          const nearestCandle =
            candles
              .map((candle) => ({
                time: Math.floor(
                  new Date(candle.eventTime).getTime() / 1000,
                ),
                open: Number(candle.open),
                high: Number(candle.high),
                low: Number(candle.low),
                close: Number(candle.close),
              }))
              .filter(
                (item) =>
                  Number.isFinite(item.time) &&
                  Number.isFinite(item.open) &&
                  Number.isFinite(item.high) &&
                  Number.isFinite(item.low) &&
                  Number.isFinite(item.close),
              )
              .reduce<{
                time: number;
                open: number;
                high: number;
                low: number;
                close: number;
              } | null>((best, item) => {
                if (!best) {
                  return item;
                }

                return Math.abs(item.time - hoveredTime) <
                  Math.abs(best.time - hoveredTime)
                  ? item
                  : best;
              }, null);

          if (nearestCandle) {
            setCursorPosition({
              x: cursorX,
              y: cursorY,
              time: hoveredTime,
              price,
              open: nearestCandle.open,
              high: nearestCandle.high,
              low: nearestCandle.low,
              close: nearestCandle.close,
            });
          } else {
            setCursorPosition(null);
          }
        } else {
          setCursorPosition(null);
        }
      } else {
        setCursorPosition(null);
      }

      const pendingOrderDrag =
        pendingOrderDragRef.current;

      if (pendingOrderDrag) {
        const series =
          candleSeriesRef.current;

        if (!series) {
          return;
        }

        const raw =
          series.coordinateToPrice(cursorY);

        if (
          raw == null ||
          !Number.isFinite(raw)
        ) {
          return;
        }

        const move =
          priceMinMove > 0
            ? priceMinMove
            : 0.01;

        const nextPrice = Number(
          (
            Math.round(
              Number(raw) / move,
            ) * move
          ).toFixed(
            pricePrecision,
          ),
        );

        pendingOrderDragRef.current = {
          orderId:
            pendingOrderDrag.orderId,
          price: nextPrice,
        };

        setPendingOrderDragPreview({
          orderId:
            pendingOrderDrag.orderId,
          price: nextPrice,
        });

        suppressDrawingClickRef.current = true;

        event.preventDefault();
        event.stopPropagation();

        return;
      }

      const interaction =
        drawingPointerInteractionRef.current;

      if (!interaction) {
        return;
      }

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const distance = Math.hypot(
        x - interaction.startX,
        y - interaction.startY,
      );

      if (!interaction.dragging && distance < 2) {
        return;
      }

      const point = getDrawingPointFromScreen(x, y);

      if (!point) {
        return;
      }

      const startPoint = getDrawingPointFromScreen(
        interaction.startX,
        interaction.startY,
      );

      if (!startPoint) {
        return;
      }

      const delta = {
        time: point.time - startPoint.time,
        price: point.price - startPoint.price,
      };

      const nextState = applyDrawingEdit(
        interaction.baseState,
        interaction.target,
        delta,
      );

      interaction.dragging = true;

      drawingPointerInteractionRef.current = interaction;

      if (nextState !== drawingStateRef.current) {
        emitDrawingState(nextState);
        suppressDrawingClickRef.current = true;
      }
    };

    const handleDrawingPointerUp = (
      event: PointerEvent,
    ) => {
      // TP/SL risk handler owns pointer-up for a risk gesture.
      if (positionRiskDragRef.current?.dragging) {
        return;
      }

      const pendingOrderDrag =
        pendingOrderDragRef.current;

      if (pendingOrderDrag) {
        pendingOrderDragRef.current = null;
        setPendingOrderDragPreview(null);

        onPendingOrderPriceChangeRef.current?.(
          pendingOrderDrag.orderId,
          pendingOrderDrag.price,
        );

        suppressDrawingClickRef.current = true;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        if (
          container.hasPointerCapture?.(
            event.pointerId,
          )
        ) {
          container.releasePointerCapture?.(
            event.pointerId,
          );
        }

        return;
      }

      const interaction =
        drawingPointerInteractionRef.current;

      if (!interaction) {
        return;
      }

      drawingPointerInteractionRef.current = null;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      if (container.hasPointerCapture?.(event.pointerId)) {
        container.releasePointerCapture?.(event.pointerId);
      }

      if (interaction.dragging) {
        suppressDrawingClickRef.current = true;
      }
    };

    const handleDrawingContextMenu = (
      event: MouseEvent,
    ) => {
      event.preventDefault();

      const rect = container.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const target = resolveDrawingInteractionTarget(
        drawingStateRef.current,
        x,
        y,
        {
          width: container.clientWidth,
          height: container.clientHeight,
          timeToX: (time: number) =>
            chart.timeScale().timeToCoordinate(
              time as Time,
            ),
          priceToY: (price: number) =>
            candleSeriesRef.current?.priceToCoordinate(
              price,
            ) ?? null,
        },
      );

      if (!target) {
        closeDrawingContextMenu();

        const price =
          candleSeriesRef.current?.coordinateToPrice(y);

        setChartContextMenu({
          x: Math.min(
            x,
            Math.max(8, container.clientWidth - 220),
          ),
          y: Math.min(
            y,
            Math.max(8, container.clientHeight - 280),
          ),
          price:
            price != null && Number.isFinite(price)
              ? Number(price)
              : null,
        });

        return;
      }

      const nextState: DrawingState = {
        ...drawingStateRef.current,
        selectedDrawingId: target.drawingId,
        activeTool: "SELECT",
      };

      drawingStateRef.current = nextState;
      setDrawingState(nextState);
      onDrawingStateChangeRef.current?.(nextState);

      setDrawingSettingsOpen(false);
      setDrawingContextMenu({
        x: Math.min(
          event.clientX - rect.left,
          Math.max(8, container.clientWidth - 250),
        ),
        y: Math.min(
          event.clientY - rect.top,
          Math.max(8, container.clientHeight - 330),
        ),
        drawingId: target.drawingId,
      });
    };

    chartRoot.addEventListener(
      "keydown",
      handleDrawingKeyDown,
    );

    container.addEventListener(
      "contextmenu",
      handleDrawingContextMenu,
    );

    const handleDrawingPointerLeave = () => {
      setCursorPosition(null);
    };

    const handlePositionRiskPointerDown = (
      event: PointerEvent,
    ) => {
      const rect = container.getBoundingClientRect();

      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (
        x < 0 ||
        y < 0 ||
        x > container.clientWidth ||
        y > container.clientHeight
      ) {
        return;
      }

      const hit = getPositionRiskHit(y);

      if (!hit) {
        return;
      }

      const position = positionsRef.current.find(
        (candidate) =>
          candidate.id === hit.positionId &&
          candidate.status === "OPEN",
      );

      if (!position) {
        return;
      }

      positionRiskDragRef.current = {
        positionId: position.id,
        kind: hit.kind,
        originalStopLossPrice:
          position.stopLossPrice,
        originalTakeProfitPrice:
          position.takeProfitPrice,
        price: hit.price,
        dragging: true,
      };

      suppressDrawingClickRef.current = true;

      container.setPointerCapture?.(event.pointerId);

      event.preventDefault();
      event.stopPropagation();
    };

    const handlePositionRiskPointerMove = (
      event: PointerEvent,
    ) => {
      const drag = positionRiskDragRef.current;

      if (!drag?.dragging) {
        return;
      }

      const candleSeries = candleSeriesRef.current;

      if (!candleSeries) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const y = event.clientY - rect.top;

      const rawPrice =
        candleSeries.coordinateToPrice(y);

      if (rawPrice == null || !Number.isFinite(rawPrice)) {
        return;
      }

      const position = positionsRef.current.find(
        (candidate) =>
          candidate.id === drag.positionId &&
          candidate.status === "OPEN",
      );

      if (!position) {
        return;
      }

      const nextPrice = snapRiskPrice(rawPrice);

      /*
       * Keep the drag gesture alive even when the cursor temporarily
       * crosses into an invalid TP/SL region.
       *
       * The risk line remains at the last valid price until the
       * pointer returns to a valid price. This prevents the drag
       * from appearing to freeze on instruments with small tick
       * sizes or compressed price scales.
       */
      if (
        !isValidRiskPrice(
          position,
          drag.kind,
          nextPrice,
        )
      ) {
        return;
      }

      // Only valid prices become the authoritative drag price.
      drag.price = nextPrice;

      const runtime =
        positionRiskLinesRef.current.find(
          (candidate) =>
            candidate.positionId === drag.positionId &&
            candidate.kind === drag.kind,
        );

      if (!runtime) {
        return;
      }

      runtime.price = nextPrice;

      runtime.line.applyOptions({
        price: nextPrice,
      });

      const quantity = Number(position.quantity);
      const entryPrice = Number(position.averageEntryPrice);

      if (
        Number.isFinite(quantity) &&
        quantity > 0 &&
        Number.isFinite(entryPrice)
      ) {
        const pnl =
          position.side === "LONG"
            ? (nextPrice - entryPrice) * quantity
            : (entryPrice - nextPrice) * quantity;

        const pnlPercent =
          entryPrice !== 0
            ? (pnl / (entryPrice * quantity)) * 100
            : 0;

        setPositionRiskPreview({
          positionId: position.id,
          kind: drag.kind,
          price: nextPrice,
          pnl,
          pnlPercent,
          y,
        });
      }

      event.preventDefault();
      event.stopPropagation();
    };

    const handlePositionRiskPointerUp = (
      event: PointerEvent,
    ) => {
      const drag = positionRiskDragRef.current;

      if (!drag?.dragging) {
        return;
      }

      positionRiskDragRef.current = null;
      setPositionRiskPreview(null);

      try {
        container.releasePointerCapture?.(
          event.pointerId,
        );
      } catch {
        // Pointer capture may already have been released.
      }

      const position = positionsRef.current.find(
        (candidate) =>
          candidate.id === drag.positionId &&
          candidate.status === "OPEN",
      );

      if (!position) {
        return;
      }

      const stopLossPrice =
        drag.kind === "STOP_LOSS"
          ? String(drag.price)
          : drag.originalStopLossPrice;

      const takeProfitPrice =
        drag.kind === "TAKE_PROFIT"
          ? String(drag.price)
          : drag.originalTakeProfitPrice;

      onPositionRiskChangeRef.current?.(
        drag.positionId,
        {
          stopLossPrice,
          takeProfitPrice,
        },
      );

      event.preventDefault();
      event.stopPropagation();
    };

    const handlePositionRiskPointerCancel = (
      event: PointerEvent,
    ) => {
      const drag = positionRiskDragRef.current;

      if (!drag?.dragging) {
        return;
      }

      const runtime =
        positionRiskLinesRef.current.find(
          (candidate) =>
            candidate.positionId === drag.positionId &&
            candidate.kind === drag.kind,
        );

      if (runtime) {
        runtime.price =
          drag.kind === "STOP_LOSS"
            ? Number(drag.originalStopLossPrice)
            : Number(drag.originalTakeProfitPrice);

        if (Number.isFinite(runtime.price)) {
          runtime.line.applyOptions({
            price: runtime.price,
          });
        }
      }

      positionRiskDragRef.current = null;
      setPositionRiskPreview(null);

      try {
        container.releasePointerCapture?.(
          event.pointerId,
        );
      } catch {
        // Pointer capture may already have been released.
      }

      event.preventDefault();
      event.stopPropagation();
    };

    container.addEventListener(
      "pointerdown",
      handlePositionRiskPointerDown,
      true,
    );

    container.addEventListener(
      "pointermove",
      handlePositionRiskPointerMove,
      true,
    );

    container.addEventListener(
      "pointerup",
      handlePositionRiskPointerUp,
      true,
    );

    container.addEventListener(
      "pointercancel",
      handlePositionRiskPointerCancel,
      true,
    );

    chartRoot.addEventListener(
      "pointerdown",
      handleDrawingPointerDown,
      true,
    );

    container.addEventListener(
      "pointerleave",
      handleDrawingPointerLeave,
    );

    container.addEventListener(
      "pointermove",
      handleDrawingPointerMove,
    );

    container.addEventListener(
      "pointerup",
      handleDrawingPointerUp,
    );

    const handleChartClick = (param: MouseEventParams<Time>) => {
      if (suppressDrawingClickRef.current) {
        suppressDrawingClickRef.current = false;
        return;
      }

      closeChartContextMenu();

      if (
        !param.point ||
        param.point.x < 0 ||
        param.point.y < 0
      ) {
        return;
      }

      if (drawingStateRef.current.activeTool === "SELECT") {
        const selectedId = hitTestDrawings(
          drawingStateRef.current,
          {
            x: param.point.x,
            y: param.point.y,
          },
          {
            width: container.clientWidth,
            height: container.clientHeight,
            timeToX: (value) =>
              chart.timeScale().timeToCoordinate(value as Time),
            priceToY: (value) =>
              candleSeries.priceToCoordinate(value),
          },
        );

        if (selectedId === null) {
          closeDrawingContextMenu();
        }

        const nextState = {
          ...drawingStateRef.current,
          selectedDrawingId: selectedId,
        };

        drawingStateRef.current = nextState;
        setDrawingState(nextState);
        pendingDrawingPointsRef.current = [];
        setPendingDrawingPoints([]);

        onDrawingStateChangeRef.current?.(nextState);

        return;
      }

      const time = chart.timeScale().coordinateToTime(param.point.x);
      const price = candleSeries.coordinateToPrice(param.point.y);

      if (time === null || time === undefined || price === null) {
        return;
      }

      const point = screenPointToDrawingPoint(
        {
          state: drawingStateRef.current,
          timeToX: (value) =>
            chart.timeScale().timeToCoordinate(value as Time),
          priceToY: (value) =>
            candleSeries.priceToCoordinate(value),
          xToTime: (x) => {
            const time = chart.timeScale().coordinateToTime(x);

            if (time === null || time === undefined) {
              return null;
            }

            return typeof time === "number" ? time : Number(time);
          },
          yToPrice: (y) =>
            candleSeries.coordinateToPrice(y),
        },
        param.point.x,
        param.point.y,
      );

      const result = addDrawingInteractionPoint(
        drawingStateRef.current,
        point,
        pendingDrawingPointsRef.current,
        selectedDrawingTemplate?.style,
        selectedDrawingTemplate?.content,
      );

      pendingDrawingPointsRef.current =
        result.pendingPoints;

      drawingStateRef.current = result.state;

      if (result.completed) {
        setSelectedDrawingTemplate(null);
      }

      setPendingDrawingPoints(result.pendingPoints);
      setDrawingState(result.state);

      onDrawingStateChangeRef.current?.(
        result.state,
      );
    };

    chart.subscribeClick(handleChartClick);

    return () => {
      chart.unsubscribeClick(handleChartClick);
      timeScale.unsubscribeVisibleLogicalRangeChange(
        handleVisibleLogicalRangeChange,
      );

      chartRoot.removeEventListener(
        "keydown",
        handleDrawingKeyDown,
      );

      container.removeEventListener(
        "pointerdown",
        handlePositionRiskPointerDown,
        true,
      );

      container.removeEventListener(
        "pointermove",
        handlePositionRiskPointerMove,
        true,
      );

      container.removeEventListener(
        "pointerup",
        handlePositionRiskPointerUp,
        true,
      );

      container.removeEventListener(
        "pointercancel",
        handlePositionRiskPointerCancel,
        true,
      );

      chartRoot.removeEventListener(
        "pointerdown",
        handleDrawingPointerDown,
        true,
      );

      container.removeEventListener(
        "pointermove",
        handleDrawingPointerMove,
      );

      container.removeEventListener(
        "pointerleave",
        handleDrawingPointerLeave,
      );

      container.removeEventListener(
        "pointerup",
        handleDrawingPointerUp,
      );

      container.removeEventListener(
        "contextmenu",
        handleDrawingContextMenu,
      );

      drawingPointerInteractionRef.current = null;

      resizeObserver.disconnect();
      if (takeProfitLineRef.current) {
        candleSeriesRef.current?.removePriceLine(
          takeProfitLineRef.current,
        );
        takeProfitLineRef.current = null;
      }

      if (stopLossLineRef.current) {
        candleSeriesRef.current?.removePriceLine(
          stopLossLineRef.current,
        );
        stopLossLineRef.current = null;
      }

      for (const line of positionEntryLinesRef.current) {
        candleSeriesRef.current?.removePriceLine(line);
      }
      positionEntryLinesRef.current = [];

      for (const runtime of positionRiskLinesRef.current) {
        candleSeriesRef.current?.removePriceLine(runtime.line);
      }
      positionRiskLinesRef.current = [];

      for (const line of pendingOrderLinesRef.current) {
        candleSeriesRef.current?.removePriceLine(line);
      }
      pendingOrderLinesRef.current = [];

      backtestMarkersRef.current?.detach();
      backtestMarkersRef.current = null;

      chart.remove();

      chartRef.current = null;
      candleSeriesRef.current = null;
      overlaySeriesRef.current = [];

      previousCandleCountRef.current = 0;
      initialDataLoadedRef.current = false;
    };
  }, [
    timezone,height]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries) {
      return;
    }

    if (takeProfitLineRef.current) {
      candleSeries.removePriceLine(
        takeProfitLineRef.current,
      );
      takeProfitLineRef.current = null;
    }

    if (stopLossLineRef.current) {
      candleSeries.removePriceLine(
        stopLossLineRef.current,
      );
      stopLossLineRef.current = null;
    }

    if (
      takeProfitPrice !== null &&
      Number.isFinite(takeProfitPrice) &&
      takeProfitPrice > 0
    ) {
      takeProfitLineRef.current = candleSeries.createPriceLine({
        price: takeProfitPrice,
        color: "#33C08D",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "TP",
      });
    }

    if (
      stopLossPrice !== null &&
      Number.isFinite(stopLossPrice) &&
      stopLossPrice > 0
    ) {
      stopLossLineRef.current = candleSeries.createPriceLine({
        price: stopLossPrice,
        color: "#FF4D5A",
        lineWidth: 2,
        lineStyle: 0,
        axisLabelVisible: true,
        title: "SL",
      });
    }
  }, [takeProfitPrice, stopLossPrice]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart) {
      return;
    }

    const gridColor = `rgba(148, 163, 184, ${
      chartSettings.appearance.gridVisible
        ? chartSettings.appearance.gridOpacity
        : 0
    })`;

    chart.applyOptions({
      layout: {
        background: {
          type: ColorType.Solid,
          color:
            chartSettings.appearance.backgroundColor,
        },
        textColor:
          chartSettings.appearance.textColor,
      },
      grid: {
        vertLines: {
          color: gridColor,
        },
        horzLines: {
          color: gridColor,
        },
      },
      crosshair: {
        mode: chartSettings.crosshair.mode,
        vertLine: {
          visible:
            chartSettings.crosshair.lineOpacity > 0,
          labelVisible:
            chartSettings.crosshair.showTimeLabel,
        },
        horzLine: {
          visible:
            chartSettings.crosshair.lineOpacity > 0,
          labelVisible:
            chartSettings.crosshair.showPriceLabel,
        },
      },
      rightPriceScale: {
        borderColor:
          chartSettings.priceScale.borderVisible
            ? "rgba(148, 163, 184, 0.18)"
            : "transparent",
        autoScale:
          chartSettings.priceScale.autoScale,
      },
      timeScale: {
        borderColor:
          chartSettings.timeScale.borderVisible
            ? "rgba(148, 163, 184, 0.18)"
            : "transparent",
        timeVisible:
          chartSettings.timeScale.timeVisible,
        secondsVisible:
          chartSettings.timeScale.secondsVisible,
      },
    });

    if (
      candleSeries &&
      typeof candleSeries.applyOptions === "function"
    ) {
      candleSeries.applyOptions({
        upColor: chartSettings.candles.upColor,
        downColor: chartSettings.candles.downColor,
        borderVisible:
          chartSettings.candles.borderVisible,
        wickUpColor:
          chartSettings.candles.wickVisible
            ? chartSettings.candles.wickUpColor
            : chartSettings.candles.upColor,
        wickDownColor:
          chartSettings.candles.wickVisible
            ? chartSettings.candles.wickDownColor
            : chartSettings.candles.downColor,
        priceLineVisible:
          chartSettings.priceScale.priceLineVisible,
        lastValueVisible:
          chartSettings.priceScale.lastValueVisible,
      });
    }
  }, [chartSettings]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries || !liveCandle) {
      return;
    }

    const time = Math.floor(
      new Date(liveCandle.eventTime).getTime() / 1000,
    ) as Time;

    const open = Number(liveCandle.open);
    const high = Number(liveCandle.high);
    const low = Number(liveCandle.low);
    const close = Number(liveCandle.close);
    if (
      !Number.isFinite(Number(time)) ||
      !Number.isFinite(open) ||
      !Number.isFinite(high) ||
      !Number.isFinite(low) ||
      !Number.isFinite(close)
    ) {
      return;
    }

    const latestRenderedTime =
      latestRenderedCandleRef.current;

    /*
     * Lightweight Charts update() must not receive a timestamp older
     * than the latest rendered candle. Equal timestamps are intentional:
     * they update the currently forming candle.
     */
    if (
      latestRenderedTime !== null &&
      Number(time) < latestRenderedTime
    ) {
      return;
    }

    candleSeries.update({
      time,
      open,
      high,
      low,
      close,
    });

    latestRenderedCandleRef.current = Number(time);

  }, [liveCandle]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;

    if (
      !candleSeries ||
      currentPrice == null ||
      !Number.isFinite(currentPrice)
    ) {
      setPositionPnl(null);
      return;
    }

    const position = positions.find(
      (item) => item.status === "OPEN",
    );

    if (!position) {
      setPositionPnl(null);
      return;
    }

    const entryPrice = Number(
      position.averageEntryPrice,
    );

    const quantity = Number(position.quantity);

    if (
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setPositionPnl(null);
      return;
    }

    const pnl =
      position.side === "LONG"
        ? (currentPrice - entryPrice) * quantity
        : (entryPrice - currentPrice) * quantity;

    const pnlPercent =
      entryPrice !== 0
        ? (pnl / (entryPrice * quantity)) * 100
        : 0;

    const y =
      candleSeries.priceToCoordinate(currentPrice);

    if (y == null) {
      setPositionPnl(null);
      return;
    }

    setPositionPnl({
      positionId: position.id,
      side: position.side,
      quantity,
      entryPrice,
      currentPrice,
      pnl,
      pnlPercent,
      y,
    });
  }, [
    positions,
    currentPrice,
    candles,
    liveCandle,
  ]);

  const snapRiskPrice = (price: number): number => {
    if (!Number.isFinite(price)) {
      return price;
    }

    const minMove =
      Number.isFinite(priceMinMove) && priceMinMove > 0
        ? priceMinMove
        : 0.01;

    return Number(
      (
        Math.round(price / minMove) * minMove
      ).toFixed(12),
    );
  };

  const isValidRiskPrice = (
    position: TradingPosition,
    kind: PositionRiskLineKind,
    price: number,
  ): boolean => {
    const entryPrice = Number(
      position.averageEntryPrice,
    );

    if (
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(price)
    ) {
      return false;
    }

    if (position.side === "LONG") {
      return kind === "STOP_LOSS"
        ? price < entryPrice
        : price > entryPrice;
    }

    return kind === "STOP_LOSS"
      ? price > entryPrice
      : price < entryPrice;
  };

  const removePositionRiskLines = () => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries) {
      positionRiskLinesRef.current = [];
      return;
    }

    for (const runtime of positionRiskLinesRef.current) {
      candleSeries.removePriceLine(runtime.line);
    }

    positionRiskLinesRef.current = [];
  };

  const syncPositionRiskLines = () => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries) {
      return;
    }

    removePositionRiskLines();

    if (!chartSettings.trading.showRiskLines) {
      return;
    }

    for (const position of positions) {
      if (position.status !== "OPEN") {
        continue;
      }

      const riskLines: Array<{
        kind: PositionRiskLineKind;
        value: string | null;
      }> = [
        {
          kind: "STOP_LOSS",
          value: position.stopLossPrice,
        },
        {
          kind: "TAKE_PROFIT",
          value: position.takeProfitPrice,
        },
      ];

      for (const riskLine of riskLines) {
        const entryPrice = Number(
          position.averageEntryPrice,
        );

        if (!Number.isFinite(entryPrice)) {
          continue;
        }

        let price =
          riskLine.value == null
            ? riskLine.kind === "STOP_LOSS"
              ? position.side === "LONG"
                ? entryPrice - priceMinMove
                : entryPrice + priceMinMove
              : position.side === "LONG"
                ? entryPrice + priceMinMove
                : entryPrice - priceMinMove
            : Number(riskLine.value);

        price = snapRiskPrice(price);

        if (
          !Number.isFinite(price) ||
          !isValidRiskPrice(
            position,
            riskLine.kind,
            price,
          )
        ) {
          continue;
        }

        const isLong = position.side === "LONG";
        const isTakeProfit =
          riskLine.kind === "TAKE_PROFIT";

        const color =
          isLong === isTakeProfit
            ? "#22c55e"
            : "#ef4444";

        const line =
          candleSeries.createPriceLine({
            price,
            color,
            lineWidth: 1,
            lineStyle: 1,
            axisLabelVisible: false,
            title: "",

          });

        positionRiskLinesRef.current.push({
          positionId: position.id,
          kind: riskLine.kind,
          price,
          line,
        });
      }
    }
  };

  const getPositionRiskHit = (
    y: number,
  ): PositionRiskLineRuntime | null => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries) {
      return null;
    }

    // Give TP/SL lines a forgiving mouse/touch hit area.
    // The visible price line can be only a few pixels wide,
    // especially on instruments with large price ranges.
    const HIT_DISTANCE = 14;

    let closest:
      | PositionRiskLineRuntime
      | null = null;

    let closestDistance = Number.POSITIVE_INFINITY;

    for (const runtime of positionRiskLinesRef.current) {
      const lineY =
        candleSeries.priceToCoordinate(
          runtime.price,
        );

      if (lineY == null) {
        continue;
      }

      const distance = Math.abs(y - lineY);

      if (
        distance <= HIT_DISTANCE &&
        distance < closestDistance
      ) {
        closest = runtime;
        closestDistance = distance;
      }
    }

    return closest;
  };

  const syncPositionPriceLines = () => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries) {
      return;
    }

    for (const line of positionPriceLinesRef.current) {
      candleSeries.removePriceLine(line);
    }

    positionPriceLinesRef.current = [];

    if (!chartSettings.trading.showPositions) {
      return;
    }

    for (const position of positions) {
      if (position.status !== "OPEN") {
        continue;
      }

      const price = Number(position.averageEntryPrice);

      if (!Number.isFinite(price)) {
        continue;
      }

      const line = candleSeries.createPriceLine({
        price,
        color:
          position.side === "LONG"
            ? "#22c55e"
            : "#ef4444",
        lineWidth: 1,
        lineStyle: 0,
        axisLabelVisible: false,
        title: "",

      });

      positionPriceLinesRef.current.push(line);
    }
  };

  const syncOrderPriceLines = () => {
    const candleSeries = candleSeriesRef.current;

    if (!candleSeries) {
      return;
    }

    for (
      const runtime of orderPriceLinesRef.current
    ) {
      candleSeries.removePriceLine(
        runtime.line,
      );
    }

    orderPriceLinesRef.current = [];

    for (const order of orders) {
      if (order.status !== "PENDING") {
        continue;
      }

      const rawPrice =
        order.type === "LIMIT"
          ? order.limitPrice
          : order.stopPrice;

      if (rawPrice == null) {
        continue;
      }

      const price = Number(rawPrice);

      if (!Number.isFinite(price)) {
        continue;
      }

      const line = candleSeries.createPriceLine({
        price,
        color:
          order.side === "BUY"
            ? "#22c55e"
            : "#ef4444",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: `${order.side} ${order.type}`,
      });

      orderPriceLinesRef.current.push({
        orderId: order.id,
        price,
        line,
      });
    }
  };

  useEffect(() => {
    const markerApi = backtestMarkersRef.current;

    if (!markerApi) {
      return;
    }

    if (!replayEnabled || backtestMarkers.length === 0) {
      markerApi.setMarkers([]);
      return;
    }

    const sortedCandles = [...candles]
      .map((candle) => ({
        time: Math.floor(
          new Date(candle.eventTime).getTime() / 1000,
        ) as Time,
      }))
      .filter((item) => Number.isFinite(Number(item.time)))
      .sort(
        (a, b) =>
          Number(a.time) - Number(b.time),
      );

    const visibleCandles =
      replayCursor == null
        ? sortedCandles
        : sortedCandles.slice(
            0,
            Math.max(
              0,
              Math.min(
                replayCursor + 1,
                sortedCandles.length,
              ),
            ),
          );

    const visibleTimes = new Set(
      visibleCandles.map((candle) =>
        Number(candle.time),
      ),
    );

    const markers: SeriesMarker<Time>[] = [];

    for (const marker of backtestMarkers) {
      const time = Math.floor(
        new Date(marker.time).getTime() / 1000,
      ) as Time;

      if (!visibleTimes.has(Number(time))) {
        continue;
      }

      markers.push({
        time,
        position:
          marker.side === "LONG"
            ? marker.event === "ENTRY"
              ? "belowBar"
              : "aboveBar"
            : marker.event === "ENTRY"
              ? "aboveBar"
              : "belowBar",
        shape:
          marker.side === "LONG"
            ? "arrowUp"
            : "arrowDown",
        color:
          marker.event === "ENTRY"
            ? "#22c55e"
            : "#ef4444",
        text:
          marker.label ??
          `${marker.event} ${marker.side}`,
      });
    }

    markers.sort(
      (a, b) =>
        Number(a.time) - Number(b.time),
    );

    markerApi.setMarkers(markers);
  }, [
    backtestMarkers,
    candles,
    replayCursor,
    replayEnabled,
  ]);

  useEffect(() => {
    syncPositionPriceLines();
    syncOrderPriceLines();
    syncPositionRiskLines();

    return () => {
      const candleSeries = candleSeriesRef.current;

      if (!candleSeries) {
        return;
      }

      for (const line of positionPriceLinesRef.current) {
        candleSeries.removePriceLine(line);
      }

      positionPriceLinesRef.current = [];

      for (const runtime of positionRiskLinesRef.current) {
        candleSeries.removePriceLine(runtime.line);
      }

      positionRiskLinesRef.current = [];
    };
  }, [
    positions,
    orders,
    chartSettings.trading.showPositions,
    chartSettings.trading.showPositionLabels,
    chartSettings.trading.showRiskLines,
  ]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;

    if (!chart || !candleSeries) {
      return;
    }

    const replayCandles =
      replayEnabled && replayCursor !== null
        ? candles.slice(
            0,
            Math.max(
              0,
              Math.min(
                replayCursor + 1,
                candles.length,
              ),
            ),
          )
        : candles;

    /*
     * Lightweight Charts requires strictly ascending, unique timestamps.
     *
     * Backend candle canonicalization normally removes source duplicates,
     * but the chart keeps a defensive boundary here so duplicate logical
     * timestamps can never reach setData().
     *
     * If multiple valid rows map to the same second, retain the last row
     * received for that timestamp.
     */
    const candlesByTime = new Map<
      number,
      {
        candle: Candle;
        time: Time;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }
    >();

    for (const candle of replayCandles) {
      const time = Math.floor(
        new Date(candle.eventTime).getTime() / 1000,
      ) as Time;

      const open = Number(candle.open);
      const high = Number(candle.high);
      const low = Number(candle.low);
      const close = Number(candle.close);
      const volume = Number(candle.volume);

      if (
        !Number.isFinite(Number(time)) ||
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close) ||
        !Number.isFinite(volume)
      ) {
        continue;
      }

      candlesByTime.set(Number(time), {
        candle,
        time,
        open,
        high,
        low,
        close,
        volume,
      });
    }

    const candlesWithNumbers = [
      ...candlesByTime.values(),
    ].sort(
      (a, b) => Number(a.time) - Number(b.time),
    );

    if (candlesWithNumbers.length === 0) {
      candleSeries.setData([]);
      candleTimesRef.current = [];

      chart.timeScale().fitContent();

      previousCandleCountRef.current = 0;
      initialDataLoadedRef.current = false;
      latestRenderedCandleRef.current = null;

      return;
    }

    const candleData: CandlestickData<Time>[] = candlesWithNumbers.map(
      (item) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }),
    );

    const timeScale = chart.timeScale();

    const previousVisibleRange =
      timeScale.getVisibleLogicalRange();

    const previousCandleCount =
      previousCandleCountRef.current;

    const previousCandleTimes =
      candleTimesRef.current;

    const previousFirstCandleTime =
      previousCandleTimes.length > 0
        ? previousCandleTimes[0]!
        : null;

    candleSeries.setData(candleData);

    const latestHistoricalCandle =
      candlesWithNumbers[candlesWithNumbers.length - 1];

    latestRenderedCandleRef.current =
      latestHistoricalCandle
        ? Number(latestHistoricalCandle.time)
        : null;

    const newCandleTimes =
      candlesWithNumbers.map(
        (item) => Number(item.time),
      );

    candleTimesRef.current = newCandleTimes;

    const newCandleCount =
      candlesWithNumbers.length;

    const newFirstCandleTime =
      newCandleTimes.length > 0
        ? newCandleTimes[0]!
        : null;

    const historyPrepended =
      previousFirstCandleTime !== null &&
      newFirstCandleTime !== null &&
      newFirstCandleTime < previousFirstCandleTime;

    if (!initialDataLoadedRef.current) {
      timeScale.fitContent();
      initialDataLoadedRef.current = true;
    } else if (
      historyPrepended &&
      previousVisibleRange &&
      previousCandleCount > 0
    ) {
      const newLeftIndex =
        newCandleTimes.findIndex(
          (time) => time === previousFirstCandleTime,
        );

      if (newLeftIndex >= 0) {
        const visibleWidth =
          previousVisibleRange.to -
          previousVisibleRange.from;

        timeScale.setVisibleLogicalRange({
          from: newLeftIndex,
          to: newLeftIndex + visibleWidth,
        });
      }
    }

    previousCandleCountRef.current = newCandleCount;

    const indicatorCandles: IndicatorCandle[] = candlesWithNumbers.map(
      (item) => ({
        time: Number(item.time),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume,
      }),
    );

    const visiblePaneIndicators = indicators.filter(
      (indicator) =>
        indicator.visible &&
        indicator.placement === "pane",
    );

    const visiblePaneIds = new Set(
      visiblePaneIndicators.map(
        (indicator) => indicator.id,
      ),
    );

    // Keep pane instances stable. Only create/remove panes when
    // the indicator set itself changes; ordinary candle updates
    // reuse the existing pane and series.
    for (const [id, runtime] of indicatorPanesRef.current) {
      if (visiblePaneIds.has(id)) {
        continue;
      }

      for (const series of runtime.series) {
        chart.removeSeries(series);
      }

      const panes = chart.panes();

      const paneIndex =
        panes.indexOf(runtime.pane);

      if (paneIndex > 0) {
        chart.removePane(paneIndex);
      }

      indicatorPanesRef.current.delete(id);
    }

    const upsertLineSeries = (
      runtime: IndicatorPaneRuntime,
      title: string,
      values: Array<number | null>,
      color: string,
    ) => {
      const existing = runtime.series.find(
        (series) =>
          series.options().title === title,
      );

      const series =
        existing ??
        runtime.pane.addSeries(LineSeries, {
          color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title,
        });

      if (!existing) {
        runtime.series.push(series);
      }

      series.setData(
        values.flatMap((value, valueIndex) =>
          value === null
            ? []
            : [
                {
                  time:
                    indicatorCandles[valueIndex]!
                      .time as Time,
                  value,
                },
              ],
        ),
      );
    };

    const upsertHistogramSeries = (
      runtime: IndicatorPaneRuntime,
      title: string,
      values: Array<number | null>,
    ) => {
      const existing = runtime.series.find(
        (series) =>
          series.options().title === title,
      );

      const series =
        existing ??
        runtime.pane.addSeries(
          HistogramSeries,
          {
            priceLineVisible: false,
            lastValueVisible: false,
            title,
          },
        );

      if (!existing) {
        runtime.series.push(series);
      }

      series.setData(
        values.flatMap((value, valueIndex) =>
          value === null
            ? []
            : [
                {
                  time:
                    indicatorCandles[valueIndex]!
                      .time as Time,
                  value,
                },
              ],
        ),
      );
    };

    for (const config of visiblePaneIndicators) {
      let runtime =
        indicatorPanesRef.current.get(config.id);

      if (!runtime) {
        const pane = chart.addPane(true);

        pane.setHeight(145);

        runtime = {
          pane,
          series: [],
        };

        indicatorPanesRef.current.set(
          config.id,
          runtime,
        );
      }

      const expectedTitles =
        config.type === "RSI"
          ? [`RSI ${config.period ?? 14}`]
          : config.type === "STOCHASTIC"
            ? ["%K", "%D"]
            : config.type === "ATR"
              ? [`ATR ${config.period ?? 14}`]
              : config.type === "ADX"
                ? ["ADX", "+DI", "-DI"]
                : config.type === "MACD"
                  ? [
                      "MACD",
                      "Signal",
                      "Histogram",
                    ]
                  : config.type === "CCI"
                    ? [`CCI ${config.period ?? 20}`]
                    : config.type === "ROC"
                      ? [`ROC ${config.period ?? 12}`]
                      : config.type === "WILLIAMS_R"
                        ? [`Williams %R ${config.period ?? 14}`]
                        : config.type === "OBV"
                          ? ["OBV"]
                          : config.type === "VOLUME"
                            ? ["Volume"]
                            : [];

      for (const series of [...runtime.series]) {
        const title = series.options().title;

        if (
          title &&
          !expectedTitles.includes(title)
        ) {
          chart.removeSeries(series);

          const index =
            runtime.series.indexOf(series);

          if (index >= 0) {
            runtime.series.splice(index, 1);
          }
        }
      }

      if (config.type === "RSI") {
        const values = calculateRSI(
          indicatorCandles.map(
            (candle) => candle.close,
          ),
          config.period ?? 14,
        );

        upsertLineSeries(
          runtime,
          `RSI ${config.period ?? 14}`,
          values,
          "#38bdf8",
        );
      }

      if (config.type === "STOCHASTIC") {
        const points = calculateStochastic(
          indicatorCandles,
          config.period ?? 14,
          config.smoothK ?? 3,
          config.smoothD ?? 3,
        );

        upsertLineSeries(
          runtime,
          "%K",
          points.map((point) => point.k),
          "#38bdf8",
        );

        upsertLineSeries(
          runtime,
          "%D",
          points.map((point) => point.d),
          "#f59e0b",
        );
      }

      if (config.type === "ATR") {
        const values = calculateATR(
          indicatorCandles,
          config.period ?? 14,
        );

        upsertLineSeries(
          runtime,
          `ATR ${config.period ?? 14}`,
          values,
          "#a78bfa",
        );
      }

      if (config.type === "ADX") {
        const points = calculateADX(
          indicatorCandles,
          config.period ?? 14,
        );

        upsertLineSeries(
          runtime,
          "ADX",
          points.map((point) => point.adx),
          "#38bdf8",
        );

        upsertLineSeries(
          runtime,
          "+DI",
          points.map((point) => point.plusDi),
          "#22c55e",
        );

        upsertLineSeries(
          runtime,
          "-DI",
          points.map((point) => point.minusDi),
          "#ef4444",
        );
      }

      if (config.type === "CCI") {
        const values = calculateCCI(
          indicatorCandles,
          config.period ?? 20,
        );

        upsertLineSeries(
          runtime,
          `CCI ${config.period ?? 20}`,
          values,
          "#f59e0b",
        );
      }

      if (config.type === "ROC") {
        const values = calculateROC(
          indicatorCandles.map(
            (candle) => candle.close,
          ),
          config.period ?? 12,
        );

        upsertLineSeries(
          runtime,
          `ROC ${config.period ?? 12}`,
          values,
          "#38bdf8",
        );
      }

      if (config.type === "WILLIAMS_R") {
        const values = calculateWilliamsR(
          indicatorCandles,
          config.period ?? 14,
        );

        upsertLineSeries(
          runtime,
          `Williams %R ${config.period ?? 14}`,
          values,
          "#a78bfa",
        );
      }

      if (config.type === "OBV") {
        const values = calculateOBV(indicatorCandles);

        upsertLineSeries(
          runtime,
          "OBV",
          values,
          "#22c55e",
        );
      }

      if (config.type === "VOLUME") {
        const values = calculateVolume(indicatorCandles);

        upsertHistogramSeries(
          runtime,
          "Volume",
          values,
        );
      }

      if (config.type === "MACD") {
        const points = calculateMACD(
          indicatorCandles.map(
            (candle) => candle.close,
          ),
          config.fastPeriod ?? 12,
          config.slowPeriod ?? 26,
          config.signalPeriod ?? 9,
        );

        upsertLineSeries(
          runtime,
          "MACD",
          points.map((point) => point.macd),
          "#38bdf8",
        );

        upsertLineSeries(
          runtime,
          "Signal",
          points.map((point) => point.signal),
          "#f59e0b",
        );

        upsertHistogramSeries(
          runtime,
          "Histogram",
          points.map(
            (point) => point.histogram,
          ),
        );
      }
    }

    const visibleOverlays = indicators.filter(
      (indicator) =>
        indicator.visible && indicator.placement === "overlay",
    );

    for (const overlay of overlaySeriesRef.current) {
      for (const series of overlay.series) {
        chart.removeSeries(series);
      }
    }

    overlaySeriesRef.current = [];

    for (const config of visibleOverlays) {
      if (config.type === "SMA") {
        const values = calculateSMA(
          indicatorCandles.map((item) => item.close),
          config.period ?? 20,
        );

        const series = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `SMA ${config.period ?? 20}`,
        });

        series.setData(
          values.flatMap((value, index) =>
            value === null
              ? []
              : [{
                  time: indicatorCandles[index]!.time as Time,
                  value,
                }],
          ),
        );

        overlaySeriesRef.current.push({
          configId: config.id,
          series: [series],
        });
      }

      if (config.type === "EMA") {
        const values = calculateEMA(
          indicatorCandles.map((item) => item.close),
          config.period ?? 20,
        );

        const series = chart.addSeries(LineSeries, {
          color: "#38bdf8",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `EMA ${config.period ?? 20}`,
        });

        series.setData(
          values.flatMap((value, index) =>
            value === null
              ? []
              : [{
                  time: indicatorCandles[index]!.time as Time,
                  value,
                }],
          ),
        );

        overlaySeriesRef.current.push({
          configId: config.id,
          series: [series],
        });
      }

      if (config.type === "WMA") {
        const values = calculateWMA(
          indicatorCandles.map((item) => item.close),
          config.period ?? 20,
        );

        const series = chart.addSeries(LineSeries, {
          color: "#a78bfa",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `WMA ${config.period ?? 20}`,
        });

        series.setData(
          values.flatMap((value, index) =>
            value === null
              ? []
              : [{
                  time: indicatorCandles[index]!.time as Time,
                  value,
                }],
          ),
        );

        overlaySeriesRef.current.push({
          configId: config.id,
          series: [series],
        });
      }

      if (config.type === "VWAP") {
        const values = calculateVWAP(indicatorCandles);

        const series = chart.addSeries(LineSeries, {
          color: "#f97316",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: "VWAP",
        });

        series.setData(
          values.flatMap((value, index) =>
            value === null
              ? []
              : [{
                  time: indicatorCandles[index]!.time as Time,
                  value,
                }],
          ),
        );

        overlaySeriesRef.current.push({
          configId: config.id,
          series: [series],
        });
      }

      if (config.type === "VWMA") {
        const values = calculateVWMA(
          indicatorCandles,
          config.period ?? 20,
        );

        const series = chart.addSeries(LineSeries, {
          color: "#22c55e",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          title: `VWMA ${config.period ?? 20}`,
        });

        series.setData(
          values.flatMap((value, index) =>
            value === null
              ? []
              : [{
                  time:
                    indicatorCandles[index]!.time as Time,
                  value,
                }],
          ),
        );

        overlaySeriesRef.current.push({
          configId: config.id,
          series: [series],
        });
      }

      if (config.type === "BOLLINGER") {
        const points = calculateBollingerBands(
          indicatorCandles.map((candle) => candle.close),
          config.period ?? 20,
          config.standardDeviations ?? 2,
          indicatorCandles.map((candle) => Number(candle.time)),
        );

        const middle = chart.addSeries(LineSeries, {
          color: "#64748b",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: "BB Middle",
        });

        const upper = chart.addSeries(LineSeries, {
          color: "#94a3b8",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: "BB Upper",
        });

        const lower = chart.addSeries(LineSeries, {
          color: "#94a3b8",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          title: "BB Lower",
        });

        middle.setData(
          points.map((point) => ({
            time: point.time as Time,
            value: point.middle,
          })),
        );

        upper.setData(
          points.map((point) => ({
            time: point.time as Time,
            value: point.upper,
          })),
        );

        lower.setData(
          points.map((point) => ({
            time: point.time as Time,
            value: point.lower,
          })),
        );

        overlaySeriesRef.current.push({
          configId: config.id,
          series: [middle, upper, lower],
        });
      }
    }

  }, [
    candles,
    indicators,
    replayCursor,
    replayEnabled,
  ]);

  return (
    <div
      className="relative z-0 h-full min-h-0 w-full overflow-hidden rounded-md pointer-events-auto"
      style={height !== undefined ? { height } : undefined}
      data-testid="rmsm-candlestick-chart"
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      <div
        className="pointer-events-none absolute inset-0 z-40"
        style={{ right: 0 }}
      >
        {orders
          .filter(
            (order) =>
              order.status === "PENDING",
          )
          .map((order) => {
            const rawPrice =
              order.type === "LIMIT"
                ? order.limitPrice
                : order.stopPrice;

            const basePrice = Number(rawPrice);

            if (!Number.isFinite(basePrice)) {
              return null;
            }

            const displayPrice =
              pendingOrderDragPreview?.orderId ===
                order.id
                ? pendingOrderDragPreview.price
                : basePrice;

            const y =
              candleSeriesRef.current?.priceToCoordinate(
                displayPrice,
              );

            if (
              y == null ||
              !Number.isFinite(y)
            ) {
              return null;
            }


            return (
              <div
                key={`chart-pending-order-${order.id}`}
                data-testid={`chart-pending-order-${order.id}`}
                className="pointer-events-none absolute inset-x-0 -translate-y-1/2"
                style={{ top: y }}
              >
                <div
                  className="pointer-events-auto absolute inset-x-0"
                  style={{
                    paddingTop: 8,
                    paddingBottom: 8,
                    paddingLeft: 8,
                    paddingRight: 8,
                    margin: -8,
                    cursor: "ns-resize",
                  }}
                >
                  <div
                    className="flex items-center"
                  >

                    <button
                      type="button"
                      aria-label={`Cancel ${order.side} ${order.type} order`}
                      title="Cancel order"
                      className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded border border-border/70 bg-background/90 text-xs font-semibold text-white shadow-sm hover:bg-muted"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        onPendingOrderCancelRef.current?.(
                          order.id,
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

        {positions
          .filter((position) => position.status === "OPEN")
          .map((position) => {
            const entryPrice = Number(
              position.averageEntryPrice,
            );

            const y =
              candleSeriesRef.current?.priceToCoordinate(
                entryPrice,
              );

            if (
              !Number.isFinite(entryPrice) ||
              y == null ||
              !Number.isFinite(y)
            ) {
              return null;
            }

            return (
              <div
                key={`position-label-${position.id}`}
                className={[
                  "pointer-events-none absolute -translate-y-1/2",
                  chartSettings.trading.positionAlignment === "middle"
                    ? "-translate-x-1/2"
                    : "",
                ].join(" ")}
                style={{
                  top: y,
                  ...(chartSettings.trading.positionAlignment === "left"
                    ? { left: 44 }
                    : chartSettings.trading.positionAlignment === "middle"
                      ? { left: "50%" }
                      : { right: 0 }),
                }}
              >
                {chartSettings.trading.showPositionLabels && (
                  <div
                    className={[
                      "flex items-center gap-1 rounded-sm border",
                      "bg-slate-900/95 px-2 py-0.5",
                      "text-xs font-medium shadow-lg",
                      position.side === "LONG"
                        ? "border-emerald-500/60 text-emerald-400"
                        : "border-red-500/60 text-red-400",
                    ].join(" ")}
                  >
                    <span>
                      {position.side} {position.quantity}
                    </span>

                    <button
                      type="button"
                      className="pointer-events-auto flex h-4 w-4 items-center justify-center rounded text-xs text-white hover:bg-white/20"
                      aria-label="Close position"
                      title="Close position"
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        onPositionCloseRef.current?.(
                          position.id,
                        );
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            );
          })}

        {chartSettings.trading.showRiskLines &&
          positions
            .filter((position) => position.status === "OPEN")
            .flatMap((position) => {
              const items: Array<{
                key: string;
                kind: PositionRiskLineKind;
                price: number;
                position: TradingPosition;
              }> = [];

              const sl = Number(position.stopLossPrice);
              const tp = Number(position.takeProfitPrice);

              if (Number.isFinite(sl)) {
                items.push({
                  key: `${position.id}-SL`,
                  kind: "STOP_LOSS",
                  price: sl,
                  position,
                });
              }

              if (Number.isFinite(tp)) {
                items.push({
                  key: `${position.id}-TP`,
                  kind: "TAKE_PROFIT",
                  price: tp,
                  position,
                });
              }

              return items;
            })
            .map((item) => {
              const y =
                candleSeriesRef.current?.priceToCoordinate(
                  item.price,
                );

              if (
                y == null ||
                !Number.isFinite(y)
              ) {
                return null;
              }

              const isSL =
                item.kind === "STOP_LOSS";

              return (
                <div
                  key={item.key}
                  className={[
                    "pointer-events-none absolute -translate-y-1/2",
                    chartSettings.trading.positionAlignment === "middle"
                      ? "-translate-x-1/2"
                      : "",
                  ].join(" ")}
                  style={{
                    top: y,
                    ...(chartSettings.trading.positionAlignment === "left"
                      ? { left: 44 }
                      : chartSettings.trading.positionAlignment === "middle"
                        ? { left: "50%" }
                        : { right: 0 }),
                  }}
                >
                  <div
                    className="pointer-events-auto relative"
                    style={{
                      height: 20,
                      cursor: "ns-resize",
                    }}
                    onPointerDown={(event) => {
                      if (event.button !== 0) {
                        return;
                      }

                      const position =
                        positionsRef.current.find(
                          (candidate) =>
                            candidate.id === item.position.id &&
                            candidate.status === "OPEN",
                        );

                      if (!position) {
                        return;
                      }

                      positionRiskDragRef.current = {
                        positionId: position.id,
                        kind: item.kind,
                        originalStopLossPrice:
                          position.stopLossPrice,
                        originalTakeProfitPrice:
                          position.takeProfitPrice,
                        price: item.price,
                        dragging: true,
                      };

                      suppressDrawingClickRef.current = true;

                      try {
                        event.currentTarget.setPointerCapture(
                          event.pointerId,
                        );
                      } catch {
                        // Pointer capture may already be active.
                      }

                      event.preventDefault();
                      event.stopPropagation();
                      event.nativeEvent.stopImmediatePropagation();
                    }}
                  >
                    <div
                      className={[
                        "flex items-center gap-1 rounded-sm border",
                      "bg-slate-900/95 px-2 py-0.5",
                      "text-xs font-medium shadow-lg",
                      isSL
                        ? "border-red-500/60 text-red-400"
                        : "border-emerald-500/60 text-emerald-400",
                    ].join(" ")}
                  >
                    <span>
                      {isSL ? "SL" : "TP"}{" "}
                      {item.price.toFixed(pricePrecision)}
                    </span>

                    <button
                      type="button"
                      className="pointer-events-auto flex h-4 w-4 items-center justify-center rounded text-xs text-white hover:bg-white/20"
                      aria-label={
                        isSL
                          ? "Remove stop loss"
                          : "Remove take profit"
                      }
                      title={
                        isSL
                          ? "Remove stop loss"
                          : "Remove take profit"
                      }
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                      }}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        event.nativeEvent.stopImmediatePropagation();
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        onPositionRiskChangeRef.current?.(
                          item.position.id,
                          {
                            stopLossPrice: isSL
                              ? null
                              : item.position.stopLossPrice,
                            takeProfitPrice: isSL
                              ? item.position.takeProfitPrice
                              : null,
                          },
                        );
                      }}
                    >
                      ×
                    </button>
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      {positionRiskPreview && (
        <div
          data-testid="chart-position-risk-preview"
          className="pointer-events-none absolute right-16 z-40"
          style={{
            top: Math.max(
              12,
              positionRiskPreview.y - 30,
            ),
          }}
        >
          <div
            className={
              positionRiskPreview.pnl >= 0
                ? "rounded-md border border-emerald-500/40 bg-emerald-950/95 px-3 py-2 text-xs shadow-lg"
                : "rounded-md border border-red-500/40 bg-red-950/95 px-3 py-2 text-xs shadow-lg"
            }
          >
            <div className="font-medium text-white">
              {positionRiskPreview.kind === "TAKE_PROFIT"
                ? "TP"
                : "SL"}{" "}
              {positionRiskPreview.price.toFixed(
                pricePrecision,
              )}
            </div>

            <div
              className={
                positionRiskPreview.pnl >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }
            >
              P&L{" "}
              {positionRiskPreview.pnl >= 0 ? "+" : ""}
              {positionRiskPreview.pnl.toFixed(2)}
            </div>

            <div
              className={
                positionRiskPreview.pnl >= 0
                  ? "text-emerald-300/80"
                  : "text-red-300/80"
              }
            >
              {positionRiskPreview.pnlPercent >= 0 ? "+" : ""}
              {positionRiskPreview.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {positionPnl && (
        <div
          data-testid="chart-position-pnl"
          className="pointer-events-none absolute right-16 z-30"
          style={{
            top: Math.max(
              12,
              positionPnl.y - 30,
            ),
          }}
        >
          <div
            className={
              positionPnl.pnl >= 0
                ? "rounded-md border border-emerald-500/30 bg-emerald-950/90 px-3 py-2 text-xs shadow-lg"
                : "rounded-md border border-red-500/30 bg-red-950/90 px-3 py-2 text-xs shadow-lg"
            }
          >
            <div
              className={
                positionPnl.pnl >= 0
                  ? "font-medium text-emerald-400"
                  : "font-medium text-red-400"
              }
            >
              P&L{" "}
              {positionPnl.pnl >= 0 ? "+" : ""}
              {positionPnl.pnl.toFixed(2)}
            </div>

            <div
              className={
                positionPnl.pnl >= 0
                  ? "text-emerald-300/80"
                  : "text-red-300/80"
              }
            >
              {positionPnl.pnlPercent >= 0 ? "+" : ""}
              {positionPnl.pnlPercent.toFixed(2)}%
            </div>
          </div>
        </div>
      )}

      {cursorPosition && (
        <div
          data-testid="chart-free-crosshair"
          className="pointer-events-none absolute inset-0 z-30"
          aria-hidden="true"
        >
          <div
            data-testid="chart-crosshair-ohlc"
            className="absolute left-2 top-2 rounded-sm border border-slate-500/40 bg-slate-900/80 px-2 py-1 text-[11px] leading-4 text-slate-100 shadow-sm backdrop-blur-sm tabular-nums"
          >
            <span className="mr-3">
              O {formatCrosshairPrice(cursorPosition.open, pricePrecision)}
            </span>
            <span className="mr-3">
              H {formatCrosshairPrice(cursorPosition.high, pricePrecision)}
            </span>
            <span className="mr-3">
              L {formatCrosshairPrice(cursorPosition.low, pricePrecision)}
            </span>
            <span>
              C {formatCrosshairPrice(cursorPosition.close, pricePrecision)}
            </span>
          </div>
          <div
            className="absolute top-0 bottom-0 w-px border-l border-dotted border-slate-400/60"
            style={{
              left: cursorPosition.x,
            }}
          />

          <div
            className="absolute left-0 right-0 h-px border-t border-dotted border-slate-400/60"
            style={{
              top: cursorPosition.y,
            }}
          />

          <div
            data-testid="chart-crosshair-time"
            className="absolute rounded-sm border border-slate-500/50 bg-slate-700 px-2 py-0.5 text-[10px] leading-4 text-white shadow-sm tabular-nums"
            style={{
              left: cursorPosition.x,
              bottom: 0,
              transform: "translateX(-50%)",
            }}
          >
            {formatCrosshairTime(
              cursorPosition.time,
              timezone,
            )}
          </div>

          <div
            data-testid="chart-crosshair-price"
            className="absolute right-0 rounded-sm bg-slate-700 px-1.5 py-0.5 text-[10px] leading-4 text-white tabular-nums"
            style={{
              top: cursorPosition.y,
              transform: "translateY(-50%)",
            }}
          >
            {formatCrosshairPrice(
              cursorPosition.price,
              pricePrecision,
            )}
          </div>
        </div>
      )}

      {!hideInternalDrawingTools && (
        <MarketFavoriteToolsToolbar
          activeDrawingTool={activeDrawingTool}
          onSelectTool={(tool) => {
          const nextState: DrawingState = {
            ...drawingStateRef.current,
            activeTool: tool,
            selectedDrawingId:
              tool === "SELECT"
                ? drawingStateRef.current.selectedDrawingId
                : null,
          };

          drawingStateRef.current = nextState;
          setDrawingState(nextState);

          pendingDrawingPointsRef.current = [];
          setPendingDrawingPoints([]);

          onDrawingStateChangeRef.current?.(nextState);
        }}
        />
      )}

      {!hideInternalDrawingTools && (
        <DrawingToolbox
          activeTool={activeDrawingTool}
        selectedTemplate={selectedDrawingTemplate}
        onSelectTemplate={setSelectedDrawingTemplate}
        templatesOpen={templatesOpen}
        onTemplatesOpenChange={onTemplatesOpenChange}
        onSelect={(tool) => {
          const nextState: DrawingState = {
            ...drawingStateRef.current,
            activeTool: tool,
            selectedDrawingId:
              tool === "SELECT"
                ? drawingStateRef.current.selectedDrawingId
                : null,
          };

          drawingStateRef.current = nextState;
          setDrawingState(nextState);

          pendingDrawingPointsRef.current = [];
          setPendingDrawingPoints([]);

          onDrawingStateChangeRef.current?.(nextState);
        }}
        />
      )}

      {drawingContextMenu && contextDrawing && (
        <div
          className="absolute z-50 w-64 rounded-md border bg-popover p-1 text-popover-foreground shadow-xl"
          style={{
            left: drawingContextMenu.x,
            top: drawingContextMenu.y,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          {!drawingSettingsOpen ? (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {DRAWING_TOOL_DEFINITIONS.find(
                  (definition) =>
                    definition.type === contextDrawing.type,
                )?.label ?? contextDrawing.type}
              </div>

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => setDrawingSettingsOpen(true)}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </button>

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  const name = window.prompt(
                    "Template name:",
                    contextDrawing.type,
                  );

                  if (!name?.trim()) {
                    return;
                  }

                  saveDrawingTemplate(
                    name,
                    contextDrawing.type,
                    contextDrawing.style,
                    "text" in contextDrawing ||
                    "fontSize" in contextDrawing
                      ? {
                          text: contextDrawing.text,
                          fontSize: contextDrawing.fontSize,
                        }
                      : undefined,
                  );

                  closeDrawingContextMenu();
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Save as Template
              </button>

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  const nextState = setDrawingLocked(
                    drawingStateRef.current,
                    contextDrawing.id,
                    !contextDrawing.locked,
                  );
                  drawingStateRef.current = nextState;
                  setDrawingState(nextState);
                  onDrawingStateChangeRef.current?.(nextState);
                  closeDrawingContextMenu();
                }}
              >
                {contextDrawing.locked ? (
                  <Unlock className="mr-2 h-4 w-4" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                {contextDrawing.locked ? "Unlock" : "Lock"}
              </button>

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  const nextState = duplicateDrawing(
                    drawingStateRef.current,
                    contextDrawing.id,
                  );
                  drawingStateRef.current = nextState;
                  setDrawingState(nextState);
                  onDrawingStateChangeRef.current?.(nextState);
                  closeDrawingContextMenu();
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </button>

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  const nextState = setDrawingVisibility(
                    drawingStateRef.current,
                    contextDrawing.id,
                    !contextDrawing.visible,
                  );
                  drawingStateRef.current = nextState;
                  setDrawingState(nextState);
                  onDrawingStateChangeRef.current?.(nextState);
                  closeDrawingContextMenu();
                }}
              >
                {contextDrawing.visible ? (
                  <EyeOff className="mr-2 h-4 w-4" />
                ) : (
                  <Eye className="mr-2 h-4 w-4" />
                )}
                {contextDrawing.visible ? "Hide" : "Show"}
              </button>

              <div className="my-1 border-t" />

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  const nextState = bringDrawingToFront(
                    drawingStateRef.current,
                    contextDrawing.id,
                  );
                  drawingStateRef.current = nextState;
                  setDrawingState(nextState);
                  onDrawingStateChangeRef.current?.(nextState);
                }}
              >
                <ArrowUp className="mr-2 h-4 w-4" />
                Bring to Front
              </button>

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                onClick={() => {
                  const nextState = sendDrawingToBack(
                    drawingStateRef.current,
                    contextDrawing.id,
                  );
                  drawingStateRef.current = nextState;
                  setDrawingState(nextState);
                  onDrawingStateChangeRef.current?.(nextState);
                }}
              >
                <ArrowDown className="mr-2 h-4 w-4" />
                Send to Back
              </button>

              <div className="my-1 border-t" />

              <button
                type="button"
                className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
                onClick={() => {
                  const nextState = removeDrawing(
                    drawingStateRef.current,
                    contextDrawing.id,
                  );
                  drawingStateRef.current = nextState;
                  setDrawingState(nextState);
                  onDrawingStateChangeRef.current?.(nextState);
                  closeDrawingContextMenu();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remove
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center px-2 py-1.5">
                <button
                  type="button"
                  className="mr-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setDrawingSettingsOpen(false)}
                >
                  ←
                </button>
                <span className="text-xs font-medium">
                  {contextDrawing.type === "RECTANGLE"
                    ? "Rectangle Settings"
                    : contextDrawing.type === "TEXT"
                      ? "Text Settings"
                      : contextDrawing.type === "NOTE"
                        ? "Note Settings"
                        : contextDrawing.type === "CALLOUT"
                          ? "Callout Settings"
                          : contextDrawing.type === "PRICE_LABEL"
                            ? "Price Label Settings"
                            : "Line Settings"}
                </span>
              </div>

              <div className="space-y-3 p-2">
                {(
                  contextDrawing.type === "TEXT" ||
                  contextDrawing.type === "NOTE" ||
                  contextDrawing.type === "CALLOUT" ||
                  contextDrawing.type === "PRICE_LABEL"
                ) && (
                  <>
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">
                        {contextDrawing.type === "PRICE_LABEL"
                          ? "Label"
                          : "Text"}
                      </div>

                      <input
                        type="text"
                        value={contextDrawing.text ?? ""}
                        placeholder={
                          contextDrawing.type === "PRICE_LABEL"
                            ? "Automatic price"
                            : contextDrawing.type === "NOTE"
                              ? "Note"
                              : contextDrawing.type === "CALLOUT"
                                ? "Callout"
                                : "Text"
                        }
                        onChange={(event) =>
                          updateSelectedDrawing({
                            text: event.target.value,
                          })
                        }
                        className="w-full rounded border bg-transparent px-2 py-1.5 text-sm"
                      />

                      {contextDrawing.type === "PRICE_LABEL" && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          Leave empty to show the drawing price.
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">
                        Font Size
                      </div>

                      <div className="grid grid-cols-5 gap-1">
                        {[10, 12, 14, 16, 18].map((fontSize) => (
                          <button
                            key={fontSize}
                            type="button"
                            className={cn(
                              "rounded border px-2 py-1 text-xs",
                              (contextDrawing.fontSize ?? 14) === fontSize &&
                                "bg-accent text-accent-foreground",
                            )}
                            onClick={() =>
                              updateSelectedDrawing({
                                fontSize,
                              })
                            }
                          >
                            {fontSize}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Color
                  </div>
                  <input
                    type="color"
                    value={contextDrawing.style.color}
                    onChange={(event) =>
                      updateSelectedDrawingStyle({
                        color: event.target.value,
                      })
                    }
                    className="h-8 w-full cursor-pointer rounded border bg-transparent"
                  />
                </div>

                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Width
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {[1, 2, 3, 4, 5].map((width) => (
                      <button
                        key={width}
                        type="button"
                        className={cn(
                          "rounded border px-2 py-1 text-xs",
                          contextDrawing.style.width === width &&
                            "bg-accent text-accent-foreground",
                        )}
                        onClick={() =>
                          updateSelectedDrawingStyle({
                            width,
                          })
                        }
                      >
                        {width}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Line Style
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        "solid",
                        "dashed",
                        "dotted",
                      ] as const
                    ).map((lineStyle) => (
                      <button
                        key={lineStyle}
                        type="button"
                        className={cn(
                          "rounded border px-2 py-1 text-xs capitalize",
                          contextDrawing.style.lineStyle ===
                            lineStyle &&
                            "bg-accent text-accent-foreground",
                        )}
                        onClick={() =>
                          updateSelectedDrawingStyle({
                            lineStyle,
                          })
                        }
                      >
                        {lineStyle}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-xs text-muted-foreground">
                    Opacity
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={contextDrawing.style.opacity}
                    onChange={(event) =>
                      updateSelectedDrawingStyle({
                        opacity: Number(event.target.value),
                      })
                    }
                    className="w-full"
                  />
                </div>

                {contextDrawing.type === "RECTANGLE" && (
                  <>
                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">
                        Fill Color
                      </div>
                      <input
                        type="color"
                        value={
                          contextDrawing.style.fillColor ??
                          contextDrawing.style.color
                        }
                        onChange={(event) =>
                          updateSelectedDrawingStyle({
                            fillColor: event.target.value,
                          })
                        }
                        className="h-8 w-full cursor-pointer rounded border bg-transparent"
                        aria-label="Rectangle fill color"
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-xs text-muted-foreground">
                        Fill Opacity
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={
                          contextDrawing.style.fillOpacity ?? 0.15
                        }
                        onChange={(event) =>
                          updateSelectedDrawingStyle({
                            fillOpacity: Number(event.target.value),
                          })
                        }
                        className="w-full"
                        aria-label="Rectangle fill opacity"
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {chartContextMenu && (
        <div
          className="absolute z-50 w-56 rounded-md border bg-popover p-1 text-popover-foreground shadow-xl"
          style={{
            left: chartContextMenu.x,
            top: chartContextMenu.y,
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
        >
          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              resetView();
              closeChartContextMenu();
            }}
          >
            <ChartNoAxesCombined className="mr-2 h-4 w-4" />
            Reset chart view
          </button>

          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              autoScale();
              closeChartContextMenu();
            }}
          >
            <TrendingUp className="mr-2 h-4 w-4" />
            Auto scale
          </button>

          <div className="my-1 border-t" />

          {chartContextMenu.price != null && (
            <>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Quantity
                </span>

                <div className="flex h-7 items-center rounded-sm border">
                  <button
                    type="button"
                    disabled={
                      Number(chartContextQuantity) <= 1
                    }
                    aria-label="Decrease quantity"
                    title="Decrease quantity"
                    onClick={() => {
                      setChartContextQuantity(
                        String(
                          Math.max(
                            1,
                            Number(chartContextQuantity) - 1,
                          ),
                        ),
                      );
                    }}
                    className="flex h-full w-7 items-center justify-center text-muted-foreground hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                  >
                    −
                  </button>

                  <span className="min-w-[58px] px-2 text-center text-xs font-medium tabular-nums">
                    {chartContextQuantity} lots
                  </span>

                  <button
                    type="button"
                    aria-label="Increase quantity"
                    title="Increase quantity"
                    onClick={() => {
                      setChartContextQuantity(
                        String(
                          Number(chartContextQuantity) + 1,
                        ),
                      );
                    }}
                    className="flex h-full w-7 items-center justify-center text-muted-foreground hover:bg-accent"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="my-1 border-t" />

              {chartContextMenu.price > (currentPrice ?? Number.NaN) ? (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      const price = chartContextMenu.price;

                      if (price == null) {
                        return;
                      }

                      onChartLimitOrder?.(
                        "LIMIT",
                        "SELL",
                        price,
                        chartContextQuantity,
                      );

                      closeChartContextMenu();
                    }}
                  >
                    Sell Limit
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      const price = chartContextMenu.price;

                      if (price == null) {
                        return;
                      }

                      onChartLimitOrder?.(
                        "STOP",
                        "BUY",
                        price,
                        chartContextQuantity,
                      );

                      closeChartContextMenu();
                    }}
                  >
                    Buy Stop
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      const price = chartContextMenu.price;

                      if (price == null) {
                        return;
                      }

                      onChartLimitOrder?.(
                        "LIMIT",
                        "BUY",
                        price,
                        chartContextQuantity,
                      );

                      closeChartContextMenu();
                    }}
                  >
                    Buy Limit
                  </button>

                  <button
                    type="button"
                    className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                    onClick={() => {
                      const price = chartContextMenu.price;

                      if (price == null) {
                        return;
                      }

                      onChartLimitOrder?.(
                        "STOP",
                        "SELL",
                        price,
                        chartContextQuantity,
                      );

                      closeChartContextMenu();
                    }}
                  >
                    Sell Stop
                  </button>
                </>
              )}
            </>
          )}

          <div className="my-1 border-t" />

          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              closeChartContextMenu();
            }}
          >
            Add alert
          </button>

          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-accent"
            onClick={() => {
              const nextState = createDrawingState(
                drawingStateRef.current.activeTool,
              );

              drawingStateRef.current = nextState;
              setDrawingState(nextState);
              onDrawingStateChangeRef.current?.(nextState);
              closeChartContextMenu();
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove drawings
          </button>

          <button
            type="button"
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            onClick={() => {
              closeChartContextMenu();
              onChartSettingsOpen?.();
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </button>
        </div>
      )}

      {drawingState.drawings.length > 0 && (
        <DrawingRenderer
          drawings={drawingState.drawings}
          width={containerRef.current?.clientWidth ?? 0}
          height={containerRef.current?.clientHeight ?? 0}
          timeToX={timeToDrawingX}
          priceToY={(price) =>
            candleSeriesRef.current?.priceToCoordinate(price) ?? null
          }
          timezone={timezone}
          pricePrecision={pricePrecision}
          selectedDrawingId={drawingState.selectedDrawingId}
        />
      )}

      <div
        className="absolute bottom-10 left-1/2 z-40 -translate-x-1/2"
      >
        <MarketChartViewControls
          onZoomOut={zoomOut}
          onZoomIn={zoomIn}
          onScrollLeft={scrollLeft}
          onScrollRight={scrollRight}
          onResetView={resetView}
          hidden={!navigationControlsVisible}
          dark={embedControls}
        />
      </div>
    </div>
  );
});
