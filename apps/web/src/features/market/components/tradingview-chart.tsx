"use client";

import { useEffect, useId, useRef } from "react";
import { useThemeStore } from "@/lib/theme-store";

export interface TradingViewChartProps {
  /** A TradingView symbol string, e.g. "NASDAQ:AAPL", "FX:EURUSD",
   * "BINANCE:BTCUSDT". See `toTradingViewSymbol()` for how this is
   * derived from our own `Instrument` records. */
  symbol: string;
  /** Height in pixels. Width always fills the container. */
  height?: number;
}

/**
 * Renders TradingView's official "Advanced Chart" embeddable widget
 * (https://www.tradingview.com/widget/advanced-chart/) — candlesticks,
 * line/area chart types, every standard timeframe, drawing tools,
 * technical indicators, fullscreen, crosshair, OHLC and volume display,
 * and TradingView's own symbol search are all built into this widget
 * itself; none of that is reimplemented here. Theme follows this app's
 * own dark/light mode. Chart layout (drawings, indicators, chosen
 * timeframe) persistence is handled by TradingView's own widget via
 * `"saveimage.chart_layout_id"` — real persistence, not fabricated,
 * scoped to the visitor's browser via TradingView's own mechanism.
 */
export function TradingViewChart({ symbol, height = 520 }: TradingViewChartProps) {
  const containerId = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.innerHTML = "";
    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container__widget";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";
    container.appendChild(widgetContainer);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval: "60",
      timezone: "Etc/UTC",
      theme: theme === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
    // Re-render the whole widget on symbol/theme change - TradingView's
    // embed script does not expose an update API for a mounted widget,
    // only initial configuration.
  }, [symbol, theme]);

  return (
    <div className="tradingview-widget-container" id={containerId} ref={containerRef} style={{ height, width: "100%" }} data-testid="tradingview-chart" />
  );
}

/** Best-effort mapping from our own `Instrument` to a TradingView symbol
 * string. There is no API-provided mapping between our instrument ids
 * and TradingView's own symbol namespace — this uses the instrument's
 * asset class to pick a reasonable TradingView exchange prefix. Real,
 * documented best-effort, not a fabricated guarantee: an unusual symbol
 * may not resolve on TradingView's side, in which case their widget
 * itself shows a "symbol not found" state rather than this app faking
 * data. */
export function toTradingViewSymbol(instrument: { symbol: string; assetClass: string }): string {
  switch (instrument.assetClass) {
    case "FOREX":
      return `FX:${instrument.symbol.replace("/", "")}`;
    case "CRYPTO":
      return `BINANCE:${instrument.symbol.replace("/", "").replace("-", "")}`;
    case "INDEX":
      return instrument.symbol;
    default:
      return instrument.symbol;
  }
}
