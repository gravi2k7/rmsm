import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { IndicatorConfig } from "../../indicators/config";
import type { IndicatorCandle } from "../../indicators/technical-indicators";
import { MarketIndicatorPane } from "../market-indicator-pane";

const chartState = vi.hoisted(() => ({
  createChart: vi.fn(),
  addSeries: vi.fn(),
  removeSeries: vi.fn(),
  setData: vi.fn(),
  fitContent: vi.fn(),
  applyOptions: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("lightweight-charts", () => ({
  ColorType: {
    Solid: "Solid",
  },
  LineSeries: "Line",
  HistogramSeries: "Histogram",
  createChart: chartState.createChart,
}));

function candle(time: number): IndicatorCandle {
  return {
    time,
    open: 100 + time,
    high: 105 + time,
    low: 95 + time,
    close: 102 + time,
    volume: 1000,
  };
}

const candles = Array.from(
  { length: 40 },
  (_, index) => candle(index + 1),
);

beforeEach(() => {
  vi.clearAllMocks();

  chartState.createChart.mockReturnValue({
    addSeries: chartState.addSeries,
    removeSeries: chartState.removeSeries,
    timeScale: () => ({
      fitContent: chartState.fitContent,
    }),
    applyOptions: chartState.applyOptions,
    remove: chartState.remove,
  });

  chartState.addSeries.mockImplementation(() => ({
    setData: chartState.setData,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function indicator(
  overrides: Partial<IndicatorConfig>,
): IndicatorConfig {
  return {
    id: "rsi-14",
    type: "RSI",
    placement: "pane",
    period: 14,
    visible: true,
    ...overrides,
  };
}

describe("MarketIndicatorPane", () => {
  it("renders the indicator pane", () => {
    render(
      <MarketIndicatorPane
        candles={candles}
        indicator={indicator({})}
      />,
    );

    expect(
      screen.getByTestId("market-indicator-pane-rsi-14"),
    ).toBeInTheDocument();

    expect(chartState.createChart).toHaveBeenCalledTimes(1);
    expect(chartState.addSeries).toHaveBeenCalledTimes(1);
    expect(chartState.setData).toHaveBeenCalledTimes(1);
  });

  it("renders MACD as two lines plus histogram", () => {
    render(
      <MarketIndicatorPane
        candles={candles}
        indicator={indicator({
          id: "macd-12-26-9",
          type: "MACD",
          period: undefined,
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
        })}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(3);
    expect(chartState.setData).toHaveBeenCalledTimes(3);
  });

  it("renders stochastic with K and D lines", () => {
    render(
      <MarketIndicatorPane
        candles={candles}
        indicator={indicator({
          id: "stochastic-14-3-3",
          type: "STOCHASTIC",
          smoothK: 3,
          smoothD: 3,
        })}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(2);
    expect(chartState.setData).toHaveBeenCalledTimes(2);
  });

  it("renders ADX with ADX, plus DI and minus DI", () => {
    render(
      <MarketIndicatorPane
        candles={candles}
        indicator={indicator({
          id: "adx-14",
          type: "ADX",
        })}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(3);
    expect(chartState.setData).toHaveBeenCalledTimes(3);
  });

  it("renders ATR as a single series", () => {
    render(
      <MarketIndicatorPane
        candles={candles}
        indicator={indicator({
          id: "atr-14",
          type: "ATR",
        })}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(1);
    expect(chartState.setData).toHaveBeenCalledTimes(1);
  });

  it("handles an empty candle dataset", () => {
    render(
      <MarketIndicatorPane
        candles={[]}
        indicator={indicator({})}
      />,
    );

    expect(chartState.addSeries).not.toHaveBeenCalled();
  });

  it("removes the chart on unmount", () => {
    const { unmount } = render(
      <MarketIndicatorPane
        candles={candles}
        indicator={indicator({})}
      />,
    );

    unmount();

    expect(chartState.remove).toHaveBeenCalledTimes(1);
  });
});
