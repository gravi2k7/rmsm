import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Candle } from "../../types";

const chartState = vi.hoisted(() => ({
  createChart: vi.fn(),
  addSeries: vi.fn(),
  setData: vi.fn(),
  fitContent: vi.fn(),
  applyOptions: vi.fn(),
  priceScale: vi.fn(),
  priceScaleApplyOptions: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("lightweight-charts", () => ({
  ColorType: {
    Solid: "Solid",
  },
  CandlestickSeries: "Candlestick",
  HistogramSeries: "Histogram",
  createChart: chartState.createChart,
}));

import { RMSMCandlestickChart } from "../rmsm-candlestick-chart";

function candle(overrides: Partial<Candle> = {}): Candle {
  return {
    id: "candle-1",
    instrumentId: "instrument-1",
    interval: "ONE_MINUTE",
    eventTime: "2026-08-14T08:00:00.000Z",
    open: "4351.4302100000",
    high: "4353.6270800000",
    low: "4351.0202000000",
    close: "4351.1632700000",
    volume: "1250.50",
    isCorrection: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  chartState.createChart.mockReturnValue({
    addSeries: chartState.addSeries,
    timeScale: () => ({
      fitContent: chartState.fitContent,
    }),
    applyOptions: chartState.applyOptions,
    remove: chartState.remove,
  });

  chartState.priceScale.mockReturnValue({
    applyOptions: chartState.priceScaleApplyOptions,
  });

  chartState.addSeries.mockImplementation(() => ({
    setData: chartState.setData,
    priceScale: chartState.priceScale,
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("RMSMCandlestickChart", () => {
  it("renders the RMSM candlestick chart container", () => {
    render(<RMSMCandlestickChart candles={[]} />);

    expect(
      screen.getByTestId("rmsm-candlestick-chart"),
    ).toBeInTheDocument();

    expect(chartState.createChart).toHaveBeenCalledTimes(1);
    expect(chartState.addSeries).toHaveBeenCalledTimes(2);
  });

  it("maps decimal-string OHLC values into chart candle numbers", () => {
    render(
      <RMSMCandlestickChart
        candles={[
          candle({
            eventTime: "2026-08-14T08:01:00.000Z",
            open: "4351.6490600000",
            high: "4354.6420500000",
            low: "4351.6490600000",
            close: "4354.2684500000",
          }),
        ]}
      />,
    );

    const calls = chartState.setData.mock.calls;

    expect(calls).toHaveLength(2);

    expect(calls[0]![0]).toEqual([
      {
        time: Math.floor(
          new Date("2026-08-14T08:01:00.000Z").getTime() / 1000,
        ),
        open: 4351.64906,
        high: 4354.64205,
        low: 4351.64906,
        close: 4354.26845,
      },
    ]);

    expect(chartState.fitContent).toHaveBeenCalledTimes(1);
  });

  it("maps decimal-string volume into histogram data", () => {
    render(
      <RMSMCandlestickChart
        candles={[
          candle({
            eventTime: "2026-08-14T08:01:00.000Z",
            open: "100",
            high: "110",
            low: "90",
            close: "105",
            volume: "12345.670000",
          }),
        ]}
      />,
    );

    const calls = chartState.setData.mock.calls;

    expect(calls).toHaveLength(2);

    expect(calls[1]![0]).toEqual([
      {
        time: Math.floor(
          new Date("2026-08-14T08:01:00.000Z").getTime() / 1000,
        ),
        value: 12345.67,
        color: "rgba(34, 197, 94, 0.45)",
      },
    ]);
  });

  it("colors volume bars according to candle direction", () => {
    render(
      <RMSMCandlestickChart
        candles={[
          candle({
            id: "up",
            eventTime: "2026-08-14T08:01:00.000Z",
            open: "100",
            high: "110",
            low: "90",
            close: "105",
            volume: "1000",
          }),
          candle({
            id: "down",
            eventTime: "2026-08-14T08:02:00.000Z",
            open: "105",
            high: "108",
            low: "95",
            close: "100",
            volume: "2000",
          }),
        ]}
      />,
    );

    const calls = chartState.setData.mock.calls;
    const volumeData = calls[1]![0];

    expect(volumeData).toHaveLength(2);
    expect(volumeData[0].color).toBe(
      "rgba(34, 197, 94, 0.45)",
    );
    expect(volumeData[1].color).toBe(
      "rgba(239, 68, 68, 0.45)",
    );
  });

  it("sorts candles chronologically before sending candle and volume data", () => {
    render(
      <RMSMCandlestickChart
        candles={[
          candle({
            id: "candle-2",
            eventTime: "2026-08-14T08:02:00.000Z",
            open: "2",
            high: "3",
            low: "1",
            close: "2.5",
            volume: "200",
          }),
          candle({
            id: "candle-1",
            eventTime: "2026-08-14T08:01:00.000Z",
            open: "1",
            high: "2",
            low: "0.5",
            close: "1.5",
            volume: "100",
          }),
        ]}
      />,
    );

    const calls = chartState.setData.mock.calls;

    const candleData = calls[0]![0];
    const volumeData = calls[1]![0];

    expect(candleData).toHaveLength(2);
    expect(volumeData).toHaveLength(2);

    expect(candleData[0].open).toBe(1);
    expect(candleData[1].open).toBe(2);

    expect(volumeData[0].value).toBe(100);
    expect(volumeData[1].value).toBe(200);

    expect(Number(candleData[0].time)).toBeLessThan(
      Number(candleData[1].time),
    );
  });

  it("filters candles containing invalid OHLC or volume values", () => {
    render(
      <RMSMCandlestickChart
        candles={[
          candle({
            id: "valid",
            open: "100",
            high: "110",
            low: "90",
            close: "105",
            volume: "1000",
          }),
          candle({
            id: "invalid",
            open: "not-a-number",
            high: "110",
            low: "90",
            close: "105",
            volume: "1000",
          }),
          candle({
            id: "invalid-volume",
            open: "100",
            high: "110",
            low: "90",
            close: "105",
            volume: "not-a-number",
          }),
        ]}
      />,
    );

    const calls = chartState.setData.mock.calls;

    const candleData = calls[0]![0];
    const volumeData = calls[1]![0];

    expect(candleData).toHaveLength(1);
    expect(volumeData).toHaveLength(1);

    expect(candleData[0]).toMatchObject({
      open: 100,
      high: 110,
      low: 90,
      close: 105,
    });

    expect(volumeData[0].value).toBe(1000);
  });

  it("handles an empty candle dataset", () => {
    render(<RMSMCandlestickChart candles={[]} />);

    expect(chartState.setData).toHaveBeenCalledTimes(2);
    expect(chartState.setData).toHaveBeenNthCalledWith(1, []);
    expect(chartState.setData).toHaveBeenNthCalledWith(2, []);

    expect(chartState.fitContent).toHaveBeenCalledTimes(1);
  });

  it("removes the chart when the component unmounts", () => {
    const { unmount } = render(
      <RMSMCandlestickChart candles={[candle()]} />,
    );

    expect(chartState.remove).not.toHaveBeenCalled();

    unmount();

    expect(chartState.remove).toHaveBeenCalledTimes(1);
  });
});
