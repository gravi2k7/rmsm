"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MarketDrawingToolsMenu } from "@/features/market/components/market-drawing-tools-menu";
import { MarketTimeframeMenu } from "@/features/market/components/market-timeframe-menu";
import { RMSMCandlestickChart } from "@/features/market/components/rmsm-candlestick-chart";
import type { CandleInterval } from "@/features/market/types";
import type {
  DrawingState,
  DrawingType,
} from "@/features/market/drawings/types";
import { createDrawingState } from "@/features/market/drawings/state";
import {
  DRAWING_TOOL_DEFINITIONS,
} from "@/features/market/drawings/registry";

type EmbedCandle = {
  eventTime: string;
  open: string | number;
  high: string | number;
  low: string | number;
  close: string | number;
  volume?: string | number | null;
};

type EmbedQuote = {
  bid?: string | number | null;
  ask?: string | number | null;
  last?: string | number | null;
};

type EmbedPosition = {
  positionId: string;
  side: "LONG" | "SHORT";
  quantity?: string | number | null;
  averageEntryPrice?: string | number | null;
  stopLossPrice?: string | number | null;
  takeProfitPrice?: string | number | null;
};

type EmbedPendingOrder = {
  orderId: string;
  side: "BUY" | "SELL";
  type: "LIMIT" | "STOP";
  quantity?: string | number | null;
  limitPrice?: string | number | null;
  stopPrice?: string | number | null;
  stopLossPrice?: string | number | null;
  takeProfitPrice?: string | number | null;
};

type EmbedMessage = {
  type: "rmsm:init" | "rmsm:update";
  candles?: EmbedCandle[];
  interval?: string;
  quote?: EmbedQuote | null;
  positions?: EmbedPosition[];
  pendingOrders?: EmbedPendingOrder[];
};

type WebCommand =
  | {
      type: "rmsm:set-tool";
      tool: DrawingType;
    }
  | {
      type: "rmsm:set-drawings";
      state: DrawingState;
    }
  | {
      type: "rmsm:clear-drawings";
    };

const TIMEFRAMES: Array<{
  value: CandleInterval;
  label: string;
}> = [
  { value: "ONE_MINUTE", label: "1m" },
  { value: "FIVE_MINUTES", label: "5m" },
  { value: "FIFTEEN_MINUTES", label: "15m" },
  { value: "THIRTY_MINUTES", label: "30m" },
  { value: "ONE_HOUR", label: "1H" },
  { value: "FOUR_HOURS", label: "4H" },
  { value: "ONE_DAY", label: "1D" },
  { value: "ONE_WEEK", label: "1W" },
  { value: "ONE_MONTH", label: "1M" },
];


function normalizeCandles(candles: EmbedCandle[]) {
  return candles
    .map((candle) => ({
      eventTime: candle.eventTime,
      open: String(candle.open),
      high: String(candle.high),
      low: String(candle.low),
      close: String(candle.close),
      volume:
        candle.volume === null || candle.volume === undefined
          ? "0"
          : String(candle.volume),
    }))
    .sort(
      (a, b) =>
        new Date(a.eventTime).getTime() -
        new Date(b.eventTime).getTime(),
    );
}

function normalizeInterval(interval?: string) {
  switch (interval) {
    case "ONE_MINUTE":
      return "ONE_MINUTE";
    case "FIVE_MINUTES":
      return "FIVE_MINUTES";
    case "FIFTEEN_MINUTES":
      return "FIFTEEN_MINUTES";
    case "THIRTY_MINUTES":
      return "THIRTY_MINUTES";
    case "ONE_HOUR":
      return "ONE_HOUR";
    case "FOUR_HOURS":
      return "FOUR_HOURS";
    case "ONE_DAY":
      return "ONE_DAY";
    case "ONE_WEEK":
      return "ONE_WEEK";
    case "ONE_MONTH":
      return "ONE_MONTH";
    default:
      return "FIFTEEN_MINUTES";
  }
}

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

function postToNative(message: Record<string, unknown>) {
  if (typeof window === "undefined") {
    return;
  }

  window.ReactNativeWebView?.postMessage(
    JSON.stringify(message),
  );
}

export default function ChartEmbedPage({
  params,
}: {
  params: { instrumentId: string };
}) {
  const [candles, setCandles] = useState<EmbedCandle[]>([]);
  const [interval, setInterval] =
    useState<CandleInterval>("FIFTEEN_MINUTES");
  const [quote, setQuote] = useState<EmbedQuote | null>(null);
  const [positions, setPositions] =
    useState<EmbedPosition[]>([]);
  const [pendingOrders, setPendingOrders] =
    useState<EmbedPendingOrder[]>([]);
  const [ready, setReady] = useState(false);

  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingType>("SELECT");

  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);
  const [chartMenuOpen, setChartMenuOpen] = useState(false);

  const [drawingState, setDrawingState] =
    useState<DrawingState>(() => createDrawingState());

  const initialisedRef = useRef(false);

  const handleMessage = useCallback((event: MessageEvent) => {
    let message: EmbedMessage;

    try {
      message = JSON.parse(event.data) as EmbedMessage;
    } catch {
      return;
    }

    if (
      message.type !== "rmsm:init" &&
      message.type !== "rmsm:update"
    ) {
      return;
    }

    if (message.candles) {
      setCandles(normalizeCandles(message.candles));
    }

    if (message.interval) {
      setInterval(normalizeInterval(message.interval));
    }

    if (message.quote !== undefined) {
      setQuote(message.quote);
    }

    if (message.positions !== undefined) {
      setPositions(message.positions);
    }

    if (message.pendingOrders !== undefined) {
      setPendingOrders(message.pendingOrders);
    }

    if (
      message.positions !== undefined ||
      message.pendingOrders !== undefined
    ) {
      postToNative({
        type: "rmsm:trading-overlay-state",
        instrumentId: params.instrumentId,
        positionCount: message.positions?.length ?? 0,
        pendingOrderCount: message.pendingOrders?.length ?? 0,
        positions: message.positions ?? [],
        pendingOrders: message.pendingOrders ?? [],
      });
    }

    if (message.type === "rmsm:init") {
      initialisedRef.current = true;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage as EventListener);

    postToNative({
      type: "rmsm:ready",
      instrumentId: params.instrumentId,
      drawingTools: DRAWING_TOOL_DEFINITIONS.map(
        (definition) => definition.type,
      ),
    });

    setReady(true);

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener(
        "message",
        handleMessage as EventListener,
      );
    };
  }, [handleMessage, params.instrumentId]);

  useEffect(() => {
    const receiveCommand = (event: MessageEvent) => {
      let command: WebCommand;

      try {
        command = JSON.parse(event.data) as WebCommand;
      } catch {
        return;
      }

      switch (command.type) {
        case "rmsm:set-tool":
          setActiveDrawingTool(command.tool);
          break;

        case "rmsm:set-drawings":
          setDrawingState(command.state);
          break;

        case "rmsm:clear-drawings":
          setDrawingState(createDrawingState());
          break;
      }
    };

    window.addEventListener("message", receiveCommand);

    return () => {
      window.removeEventListener("message", receiveCommand);
    };
  }, []);

  const liveQuote = useMemo(() => {
    if (!quote) {
      return null;
    }

    return {
      bid: quote.bid == null ? "" : String(quote.bid),
      ask: quote.ask == null ? "" : String(quote.ask),
      last:
        quote.last == null
          ? quote.bid == null
            ? quote.ask == null
              ? ""
              : String(quote.ask)
            : String(quote.bid)
          : String(quote.last),
    } as never;
  }, [quote]);

  useEffect(() => {
    postToNative({
      type: "rmsm:drawing-state",
      state: drawingState,
    });
  }, [drawingState]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    postToNative({
      type: "rmsm:chart-state",
      candles: candles.length,
      interval,
      activeDrawingTool,
    });
  }, [activeDrawingTool, candles.length, interval, ready]);

  if (candles.length === 0) {
    return (
      <main
        style={{
          width: "100vw",
          height: "100vh",
          background: "#0b1220",
        }}
      />
    );
  }

  const chartSurface = "#0b1220";
  const controlSurface = "rgba(15, 23, 42, 0.96)";
    const borderColor = "rgba(148, 163, 184, 0.18)";
  const textColor = "#e5edf7";
  const mutedColor = "#8290a6";
  const accentColor = "#22d3ee";
  const accentSoft = "rgba(34, 211, 238, 0.14)";

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: chartSurface,
        color: textColor,
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {/* ---------------------------------------------------
          MOBILE CHART HEADER
          --------------------------------------------------- */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 6,
          height: 42,
          padding: "4px 6px",
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          background: controlSurface,
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.24)",
        }}
      >
        {/* Compact timeframe + drawing controls */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            flex: 1,
            minWidth: 0,
          }}
        >
          <MarketTimeframeMenu
            value={interval}
            options={TIMEFRAMES}
            onChange={(nextInterval) => {
              setInterval(nextInterval);
              postToNative({
                type: "rmsm:timeframe-change",
                interval: nextInterval,
              });
            }}
          />

          <MarketDrawingToolsMenu
            activeDrawingTool={activeDrawingTool}
            open={drawingMenuOpen}
            onOpenChange={(open) => {
              setDrawingMenuOpen(open);

              if (open) {
                setChartMenuOpen(false);
              }
            }}
            onSelectTool={(tool) => {
              setActiveDrawingTool(tool);
              postToNative({
                type: "rmsm:drawing-tool",
                tool,
              });
            }}
          />
        </div>

        {/* Chart menu */}
        <div
          style={{
            position: "relative",
            flex: "0 0 auto",
          }}
        >
          <button
            type="button"
            aria-label="Chart menu"
            aria-expanded={chartMenuOpen}
            onClick={() => {
              setChartMenuOpen((open) => !open);
              setDrawingMenuOpen(false);
            }}
            style={{
              width: 34,
              height: 32,
              border: `1px solid ${
                chartMenuOpen ? accentColor : borderColor
              }`,
              borderRadius: 8,
              background: chartMenuOpen ? accentSoft : "transparent",
              color: chartMenuOpen ? accentColor : textColor,
              fontSize: 20,
              lineHeight: 1,
              cursor: "pointer",
            }}
          >
            ⋮
          </button>

          {chartMenuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: 38,
                right: 0,
                width: 190,
                padding: 6,
                border: `1px solid ${borderColor}`,
                borderRadius: 12,
                background: controlSurface,
                boxShadow: "0 14px 36px rgba(0,0,0,0.38)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              {[
                ["Crosshair", "⌖"],
                ["Chart settings", "⚙"],
                ["Reset chart", "↺"],
                ["Fullscreen", "⛶"],
              ].map(([label, icon]) => (
                <button
                  key={label}
                  type="button"
                  role="menuitem"
                  disabled
                  title={`${label} is available from the chart workstation`}
                  style={{
                    width: "100%",
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "0 10px",
                    border: 0,
                    borderRadius: 8,
                    background: "transparent",
                    color: mutedColor,
                    fontSize: 12,
                    textAlign: "left",
                    cursor: "default",
                    opacity: 0.8,
                  }}
                >
                  <span
                    style={{
                      width: 20,
                      textAlign: "center",
                      color: textColor,
                      fontSize: 15,
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------
          CHART
          --------------------------------------------------- */}
      <RMSMCandlestickChart
        candles={candles as never}
        interval={interval as never}
        liveQuote={liveQuote}
        positions={positions}
        pendingOrders={pendingOrders}
        activeDrawingTool={activeDrawingTool}
        drawingState={drawingState}
        onDrawingStateChange={(state) => {
          setDrawingState(state);
          postToNative({
            type: "rmsm:drawing-state",
            state,
          });
        }}
        height={window.innerHeight}
      />
    </main>
  );
}
