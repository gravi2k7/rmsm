"use client";

import { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { Candle } from "../types";

interface RMSMCandlestickChartProps {
  candles: Candle[];
  height?: number;
}

export function RMSMCandlestickChart({
  candles,
  height,
}: RMSMCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
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
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(148, 163, 184, 0.45)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#334155",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.45)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#334155",
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
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineVisible: true,
      lastValueVisible: true,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: {
        type: "volume",
      },
      priceScaleId: "",
      color: "rgba(148, 163, 184, 0.45)",
      lastValueVisible: false,
      priceLineVisible: false,
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.75,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const { width, height: containerHeight } = entry.contentRect;

      if (width > 0 && containerHeight > 0) {
        chart.applyOptions({
          width,
          height: height === undefined ? containerHeight : height,
        });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();

      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    if (!candleSeries || !volumeSeries) {
      return;
    }

    const candlesWithNumbers = candles
      .map((candle) => ({
        candle,
        time: Math.floor(new Date(candle.eventTime).getTime() / 1000) as Time,
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      }))
      .filter(
        (item) =>
          Number.isFinite(item.time) &&
          Number.isFinite(item.open) &&
          Number.isFinite(item.high) &&
          Number.isFinite(item.low) &&
          Number.isFinite(item.close) &&
          Number.isFinite(item.volume),
      )
      .sort((a, b) => Number(a.time) - Number(b.time));

    const candleData: CandlestickData<Time>[] = candlesWithNumbers.map(
      (item) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
      }),
    );

    const volumeData: HistogramData<Time>[] = candlesWithNumbers.map(
      (item) => ({
        time: item.time,
        value: item.volume,
        color:
          item.close >= item.open
            ? "rgba(34, 197, 94, 0.45)"
            : "rgba(239, 68, 68, 0.45)",
      }),
    );

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-0 w-full overflow-hidden rounded-md"
      style={height !== undefined ? { height } : undefined}
      data-testid="rmsm-candlestick-chart"
    />
  );
}
