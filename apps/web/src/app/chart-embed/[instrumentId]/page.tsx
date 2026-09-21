"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RMSMCandlestickChart } from "@/features/market/components/rmsm-candlestick-chart";
import { MarketDrawingToolsMenu } from "@/features/market/components/market-drawing-tools-menu";
import type { DrawingState } from "@/features/market/drawings/types";
import { createDrawingState } from "@/features/market/drawings/state";
import {
  DRAWING_TOOL_DEFINITIONS,
  type DrawingType,
} from "@rmsm/chart-drawing";

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

type EmbedMessage = {
  type: "rmsm:init" | "rmsm:update";
  candles?: EmbedCandle[];
  interval?: string;
  quote?: EmbedQuote | null;
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
  const [interval, setInterval] = useState("FIFTEEN_MINUTES");
  const [quote, setQuote] = useState<EmbedQuote | null>(null);
  const [ready, setReady] = useState(false);

  const [activeDrawingTool, setActiveDrawingTool] =
    useState<DrawingType>("SELECT");

  const [drawingMenuOpen, setDrawingMenuOpen] = useState(false);

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

  return (
    <main
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#0b1220",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          zIndex: 100,
        }}
      >
        <MarketDrawingToolsMenu
          activeDrawingTool={activeDrawingTool}
          open={drawingMenuOpen}
          onOpenChange={setDrawingMenuOpen}
          onSelectTool={(tool) => {
            const sharedTool = DRAWING_TOOL_DEFINITIONS.find(
              (definition) => definition.type === tool,
            )?.type;

            if (!sharedTool) {
              return;
            }

            setActiveDrawingTool(sharedTool);
            postToNative({
              type: "rmsm:drawing-tool",
              tool: sharedTool,
            });
          }}
        />
      </div>

      <RMSMCandlestickChart
        candles={candles as never}
        interval={interval as never}
        currentPrice={
          quote?.last != null
            ? Number(quote.last)
            : quote?.bid != null
              ? Number(quote.bid)
              : quote?.ask != null
                ? Number(quote.ask)
                : null
        }
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
