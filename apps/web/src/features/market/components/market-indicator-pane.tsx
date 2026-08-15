"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  LineSeries,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { IndicatorConfig } from "../indicators/config";
import {
  calculateADX,
  calculateATR,
  calculateMACD,
  calculateRSI,
  calculateStochastic,
  type IndicatorCandle,
} from "../indicators/technical-indicators";

interface MarketIndicatorPaneProps {
  candles: IndicatorCandle[];
  indicator: IndicatorConfig;
  height?: number;
}

export function MarketIndicatorPane({
  candles,
  indicator,
  height = 150,
}: MarketIndicatorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line" | "Histogram">[]>([]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const chart = createChart(container, {
      width: container.clientWidth,
      height,
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
      rightPriceScale: {
        borderColor: "rgba(148, 163, 184, 0.18)",
        minimumWidth: 64,
      },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.18)",
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const { width } = entry.contentRect;

      if (width > 0) {
        chart.applyOptions({
          width,
          height,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = [];
    };
  }, [height]);

  useEffect(() => {
    const chart = chartRef.current;

    if (!chart) {
      return;
    }

    for (const series of seriesRef.current) {
      chart.removeSeries(series);
    }

    seriesRef.current = [];

    if (candles.length === 0) {
      return;
    }

    const addLine = (
      title: string,
      values: Array<number | null>,
      color: string,
    ) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth: 2,
        priceLineVisible: false,
        lastValueVisible: true,
        title,
      });

      series.setData(
        values.flatMap((value, index) =>
          value === null
            ? []
            : [
                {
                  time: candles[index]!.time as Time,
                  value,
                },
              ],
        ),
      );

      seriesRef.current.push(series);
    };

    if (indicator.type === "RSI") {
      const values = calculateRSI(
        candles.map((candle) => candle.close),
        indicator.period ?? 14,
      );

      addLine("RSI", values, "#38bdf8");
    }

    if (indicator.type === "MACD") {
      const points = calculateMACD(
        candles.map((candle) => candle.close),
        indicator.fastPeriod ?? 12,
        indicator.slowPeriod ?? 26,
        indicator.signalPeriod ?? 9,
      );

      const macd = chart.addSeries(LineSeries, {
        color: "#38bdf8",
        lineWidth: 2,
        priceLineVisible: false,
        title: "MACD",
      });

      const signal = chart.addSeries(LineSeries, {
        color: "#f59e0b",
        lineWidth: 2,
        priceLineVisible: false,
        title: "Signal",
      });

      const histogram = chart.addSeries(HistogramSeries, {
        priceLineVisible: false,
        lastValueVisible: false,
        title: "Histogram",
      });

      macd.setData(
        points.map((point) => ({
          time: point.time as Time,
          value: point.macd,
        })),
      );

      signal.setData(
        points.flatMap((point) =>
          point.signal === null
            ? []
            : [
                {
                  time: point.time as Time,
                  value: point.signal,
                },
              ],
        ),
      );

      histogram.setData(
        points.flatMap((point) =>
          point.histogram === null
            ? []
            : [
                {
                  time: point.time as Time,
                  value: point.histogram,
                },
              ],
        ),
      );

      seriesRef.current.push(macd, signal, histogram);
    }

    if (indicator.type === "STOCHASTIC") {
      const points = calculateStochastic(
        candles,
        indicator.period ?? 14,
        indicator.smoothK ?? 3,
        indicator.smoothD ?? 3,
      );

      addLine(
        "%K",
        points.map((point) => point.k),
        "#38bdf8",
      );

      addLine(
        "%D",
        points.map((point) => point.d),
        "#f59e0b",
      );
    }

    if (indicator.type === "ATR") {
      const values = calculateATR(
        candles,
        indicator.period ?? 14,
      );

      addLine("ATR", values, "#a78bfa");
    }

    if (indicator.type === "ADX") {
      const points = calculateADX(
        candles,
        indicator.period ?? 14,
      );

      addLine(
        "ADX",
        points.map((point) => point.adx),
        "#38bdf8",
      );

      addLine(
        "+DI",
        points.map((point) => point.plusDi),
        "#22c55e",
      );

      addLine(
        "-DI",
        points.map((point) => point.minusDi),
        "#ef4444",
      );
    }

    chart.timeScale().fitContent();
  }, [candles, indicator]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-md"
      style={{ height }}
      data-testid={`market-indicator-pane-${indicator.id}`}
    >
      <div
        className="pointer-events-none absolute left-3 top-2 z-10 text-xs font-medium text-slate-400"
      >
        {indicator.type}
        {indicator.period ? ` ${indicator.period}` : ""}
      </div>

      <div
        ref={containerRef}
        className="h-full min-h-0 w-full"
      />
    </div>
  );
}
