"use client";

import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  LineSeries,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type Time,
} from "lightweight-charts";
import type { Candle, CandleInterval, Quote } from "../types";
import type { IndicatorConfig } from "../indicators/config";
import type { DrawingPoint, DrawingState, DrawingType } from "../drawings/types";
import { createDrawingState } from "../drawings/state";
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
import {
  calculateBollingerBands,
  calculateEMA,
  calculateSMA,
  calculateVWAP,
  calculateWMA,
  type IndicatorCandle,
} from "../indicators/technical-indicators";

interface RMSMCandlestickChartProps {
  candles: Candle[];
  height?: number;
  indicators?: IndicatorConfig[];
  liveQuote?: Quote | null;
  interval?: CandleInterval;
  onRequestOlder?: () => void;
  activeDrawingTool?: DrawingType;
  onDrawingStateChange?: (state: DrawingState) => void;
}

interface OverlaySeries {
  configId: string;
  series: ISeriesApi<"Line">[];
}

const EMPTY_INDICATORS: IndicatorConfig[] = [];

interface DrawingPointerInteraction {
  target: DrawingEditTarget;
  startX: number;
  startY: number;
  baseState: DrawingState;
  dragging: boolean;
}

export function RMSMCandlestickChart({
  candles,
  height,
  indicators = EMPTY_INDICATORS,
  liveQuote = null,
  interval = "ONE_MINUTE",
  onRequestOlder,
  activeDrawingTool = "SELECT",
  onDrawingStateChange,
}: RMSMCandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const overlaySeriesRef = useRef<OverlaySeries[]>([]);
  const onRequestOlderRef = useRef(onRequestOlder);
  const previousCandleCountRef = useRef(0);
  const initialDataLoadedRef = useRef(false);

  const [drawingState, setDrawingState] = useState(() =>
    createDrawingState(activeDrawingTool),
  );
  const [, setPendingDrawingPoints] = useState<DrawingPoint[]>([]);

  const drawingStateRef = useRef(drawingState);
  const pendingDrawingPointsRef = useRef<DrawingPoint[]>([]);
  const onDrawingStateChangeRef = useRef(onDrawingStateChange);

  const drawingPointerInteractionRef =
    useRef<DrawingPointerInteraction | null>(null);

  const suppressDrawingClickRef = useRef(false);

  useEffect(() => {
    drawingStateRef.current = drawingState;
  }, [drawingState]);

  useEffect(() => {
    onDrawingStateChangeRef.current = onDrawingStateChange;
  }, [onDrawingStateChange]);

  useEffect(() => {
    setDrawingState((state) => ({
      ...state,
      activeTool: activeDrawingTool,
      selectedDrawingId:
        activeDrawingTool === "SELECT"
          ? state.selectedDrawingId
          : null,
    }));

    pendingDrawingPointsRef.current = [];
    setPendingDrawingPoints([]);
  }, [activeDrawingTool]);

  useEffect(() => {
    onRequestOlderRef.current = onRequestOlder;
  }, [onRequestOlder]);

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
          height: containerHeight,
        });
      }
    });

    resizeObserver.observe(container);

    const timeScale = chart.timeScale();

    const handleVisibleLogicalRangeChange = () => {
      const range = timeScale.getVisibleLogicalRange();

      if (!range) {
        return;
      }

      if (range.from <= 20) {
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
      onDrawingStateChangeRef.current?.(nextState);
    };

    const handleDrawingPointerDown = (
      event: PointerEvent,
    ) => {
      if (
        drawingStateRef.current.activeTool !== "SELECT" ||
        event.button !== 0
      ) {
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

      const target = resolveDrawingInteractionTarget(
        drawingStateRef.current,
        x,
        y,
        getDrawingHitTestContext(),
      );

      if (!target) {
        return;
      }

      const nextState = {
        ...drawingStateRef.current,
        selectedDrawingId: target.drawingId,
      };

      emitDrawingState(nextState);

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
      const interaction =
        drawingPointerInteractionRef.current;

      if (!interaction) {
        return;
      }

      const rect = container.getBoundingClientRect();
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
      const interaction =
        drawingPointerInteractionRef.current;

      if (!interaction) {
        return;
      }

      drawingPointerInteractionRef.current = null;

      if (container.hasPointerCapture?.(event.pointerId)) {
        container.releasePointerCapture?.(event.pointerId);
      }

      if (interaction.dragging) {
        suppressDrawingClickRef.current = true;
      }
    };

    container.addEventListener(
      "pointerdown",
      handleDrawingPointerDown,
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
      );

      pendingDrawingPointsRef.current =
        result.pendingPoints;

      drawingStateRef.current = result.state;

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

      container.removeEventListener(
        "pointerdown",
        handleDrawingPointerDown,
      );

      container.removeEventListener(
        "pointermove",
        handleDrawingPointerMove,
      );

      container.removeEventListener(
        "pointerup",
        handleDrawingPointerUp,
      );

      drawingPointerInteractionRef.current = null;

      resizeObserver.disconnect();
      chart.remove();

      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRef.current = [];

      previousCandleCountRef.current = 0;
      initialDataLoadedRef.current = false;
    };
  }, [height]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    if (!candleSeries || !volumeSeries || !liveQuote?.lastPrice) {
      return;
    }

    const price = Number(liveQuote.lastPrice);

    if (!Number.isFinite(price)) {
      return;
    }

    const intervalSeconds: Record<CandleInterval, number> = {
      ONE_MINUTE: 60,
      FIVE_MINUTES: 300,
      FIFTEEN_MINUTES: 900,
      THIRTY_MINUTES: 1800,
      ONE_HOUR: 3600,
      FOUR_HOURS: 14400,
      ONE_DAY: 86400,
      ONE_WEEK: 604800,
      ONE_MONTH: 2592000,
    };

    const seconds = intervalSeconds[interval];
    const quoteSeconds = Math.floor(
      new Date(liveQuote.eventTime).getTime() / 1000,
    );

    if (!Number.isFinite(quoteSeconds)) {
      return;
    }

    const candleTime =
      Math.floor(quoteSeconds / seconds) * seconds;

    const existing = candles
      .map((candle) => ({
        time: Math.floor(
          new Date(candle.eventTime).getTime() / 1000,
        ),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume),
      }))
      .find((candle) => candle.time === candleTime);

    if (existing) {
      candleSeries.update({
        time: candleTime as Time,
        open: existing.open,
        high: Math.max(existing.high, price),
        low: Math.min(existing.low, price),
        close: price,
      });

      volumeSeries.update({
        time: candleTime as Time,
        value: Number.isFinite(existing.volume)
          ? existing.volume
          : 0,
        color:
          price >= existing.open
            ? "rgba(34, 197, 94, 0.45)"
            : "rgba(239, 68, 68, 0.45)",
      });

      return;
    }

    /*
     * No historical candle exists for the current live interval.
     * Start a new live candle from the latest traded price.
     */
    candleSeries.update({
      time: candleTime as Time,
      open: price,
      high: price,
      low: price,
      close: price,
    });

    volumeSeries.update({
      time: candleTime as Time,
      value: 0,
      color: "rgba(34, 197, 94, 0.45)",
    });
  }, [liveQuote, candles, interval]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;

    if (!chart || !candleSeries || !volumeSeries) {
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

    if (candlesWithNumbers.length === 0) {
      candleSeries.setData([]);
      volumeSeries.setData([]);

      chart.timeScale().fitContent();

      previousCandleCountRef.current = 0;
      initialDataLoadedRef.current = false;

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

    const previousVisibleRange =
      chart.timeScale().getVisibleLogicalRange();

    const previousCandleCount = previousCandleCountRef.current;

    candleSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    const newCandleCount = candlesWithNumbers.length;
    const prependedCount =
      previousCandleCount > 0
        ? Math.max(0, newCandleCount - previousCandleCount)
        : 0;

    if (!initialDataLoadedRef.current) {
      chart.timeScale().fitContent();
      initialDataLoadedRef.current = true;
    } else if (
      previousVisibleRange &&
      prependedCount > 0
    ) {
      chart.timeScale().setVisibleLogicalRange({
        from: previousVisibleRange.from + prependedCount,
        to: previousVisibleRange.to + prependedCount,
      });
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

      if (config.type === "BOLLINGER") {
        const points = calculateBollingerBands(
          indicatorCandles.map((candle) => candle.close),
          config.period ?? 20,
          config.standardDeviations ?? 2,
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

  }, [candles, indicators]);

  return (
    <div
      className="relative h-full min-h-0 w-full overflow-hidden rounded-md"
      style={height !== undefined ? { height } : undefined}
      data-testid="rmsm-candlestick-chart"
    >
      <div
        ref={containerRef}
        className="absolute inset-0"
      />

      {drawingState.drawings.length > 0 && (
        <DrawingRenderer
          drawings={drawingState.drawings}
          width={containerRef.current?.clientWidth ?? 0}
          height={containerRef.current?.clientHeight ?? 0}
          timeToX={(time) =>
            chartRef.current?.timeScale().timeToCoordinate(time as Time) ??
            null
          }
          priceToY={(price) =>
            candleSeriesRef.current?.priceToCoordinate(price) ?? null
          }
          selectedDrawingId={drawingState.selectedDrawingId}
        />
      )}
    </div>
  );
}
