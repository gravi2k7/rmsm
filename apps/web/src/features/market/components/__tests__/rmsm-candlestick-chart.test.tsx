import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Candle } from "../../types";
import type { IndicatorConfig } from "../../indicators/config";
import {
  createDrawing,
  createDrawingState,
} from "../../drawings/state";
import type { DrawingState } from "../../drawings/types";


const chartState = vi.hoisted(() => ({
  createChart: vi.fn(),
  addSeries: vi.fn(),
  paneAddSeries: vi.fn(),
  paneSetHeight: vi.fn(),
  panes: vi.fn(),
  addPane: vi.fn(),
  removePane: vi.fn(),
  setData: vi.fn(),
  fitContent: vi.fn(),
  applyOptions: vi.fn(),
  priceScale: vi.fn(),
  priceScaleApplyOptions: vi.fn(),
  remove: vi.fn(),
  removeSeries: vi.fn(),
  subscribeClick: vi.fn(),
  unsubscribeClick: vi.fn(),
}));

vi.mock("lightweight-charts", () => ({
  ColorType: {
    Solid: "Solid",
  },
  CandlestickSeries: "Candlestick",
  HistogramSeries: "Histogram",
  LineSeries: "Line",
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

  const paneSeriesFactory = () => ({
    setData: chartState.setData,
    priceScale: chartState.priceScale,
    priceToCoordinate: vi.fn(() => 100),
    coordinateToPrice: vi.fn((y: number) => y),
  });

  const panes: Array<{
    addSeries: typeof chartState.paneAddSeries;
    setHeight: typeof chartState.paneSetHeight;
  }> = [];

  chartState.panes.mockImplementation(() => panes);

  chartState.addPane.mockImplementation(() => {
    const pane = {
      addSeries: chartState.paneAddSeries,
      setHeight: chartState.paneSetHeight,
    };

    panes.push(pane);
    return pane;
  });

  chartState.removePane.mockImplementation((index: number) => {
    panes.splice(index, 1);
  });

  chartState.paneAddSeries.mockImplementation(
    paneSeriesFactory,
  );

  chartState.createChart.mockReturnValue({
    addSeries: chartState.addSeries,
    panes: chartState.panes,
    addPane: chartState.addPane,
    removePane: chartState.removePane,
    timeScale: () => ({
      fitContent: chartState.fitContent,
      getVisibleLogicalRange: vi.fn(() => null),
      subscribeVisibleLogicalRangeChange: vi.fn(),
      unsubscribeVisibleLogicalRangeChange: vi.fn(),
      timeToCoordinate: vi.fn(() => 100),
      coordinateToTime: vi.fn(() => 1),
    }),
    applyOptions: chartState.applyOptions,
    remove: chartState.remove,
    removeSeries: chartState.removeSeries,
    subscribeClick: chartState.subscribeClick,
    unsubscribeClick: chartState.unsubscribeClick,
  });

  chartState.priceScale.mockReturnValue({
    applyOptions: chartState.priceScaleApplyOptions,
  });

  chartState.addSeries.mockImplementation(() => ({
    setData: chartState.setData,
    priceScale: chartState.priceScale,
    priceToCoordinate: vi.fn(() => 100),
    coordinateToPrice: vi.fn((y: number) => y),
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
    expect(chartState.addSeries).toHaveBeenCalledTimes(1);
  });

  it("uses parent-controlled height when no explicit height is provided", () => {
    render(<RMSMCandlestickChart candles={[]} />);

    const container = screen.getByTestId("rmsm-candlestick-chart");
    const chartHost = container.firstElementChild;

    expect(container).toHaveClass("h-full");
    expect(container).toHaveClass("min-h-0");
    expect(container.style.height).toBe("");
    expect(chartHost).toBeInTheDocument();

    expect(chartState.createChart).toHaveBeenCalledWith(
      chartHost,
      expect.objectContaining({
        height: (chartHost as HTMLElement).clientHeight,
      }),
    );
  });

  it("preserves explicit chart height compatibility", () => {
    render(
      <RMSMCandlestickChart
        candles={[]}
        height={560}
      />,
    );

    const container = screen.getByTestId("rmsm-candlestick-chart");
    const chartHost = container.firstElementChild;

    expect(container.style.height).toBe("560px");
    expect(chartHost).toBeInTheDocument();

    expect(chartState.createChart).toHaveBeenCalledWith(
      chartHost,
      expect.objectContaining({
        height: 560,
      }),
    );
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

    expect(calls).toHaveLength(1);

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



  it("sorts candles chronologically before sending candle data", () => {
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

    expect(candleData).toHaveLength(2);

    expect(candleData[0].open).toBe(1);
    expect(candleData[1].open).toBe(2);


    expect(Number(candleData[0].time)).toBeLessThan(
      Number(candleData[1].time),
    );
  });

  it("filters candles containing invalid OHLC values", () => {
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

    expect(candleData).toHaveLength(1);

    expect(candleData[0]).toMatchObject({
      open: 100,
      high: 110,
      low: 90,
      close: 105,
    });

  });

  it("handles an empty candle dataset", () => {
    render(<RMSMCandlestickChart candles={[]} />);

    expect(chartState.setData).toHaveBeenCalledTimes(1);
    expect(chartState.setData).toHaveBeenNthCalledWith(1, []);

    expect(chartState.fitContent).toHaveBeenCalledTimes(1);
  });

  it("renders SMA as a single overlay line", () => {
    const indicators: IndicatorConfig[] = [
      {
        id: "sma-20",
        type: "SMA",
        placement: "overlay",
        period: 20,
        visible: true,
      },
    ];

    render(
      <RMSMCandlestickChart
        candles={Array.from({ length: 25 }, (_, index) =>
          candle({
            id: `candle-${index}`,
            eventTime: `2026-08-14T08:${String(index).padStart(2, "0")}:00.000Z`,
            open: String(100 + index),
            high: String(105 + index),
            low: String(95 + index),
            close: String(102 + index),
            volume: "1000",
          }),
        )}
        indicators={indicators}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(2);
    expect(chartState.setData).toHaveBeenCalledTimes(2);
  });

  it("renders EMA, WMA, and VWAP overlays", () => {
    const indicators: IndicatorConfig[] = [
      {
        id: "ema-20",
        type: "EMA",
        placement: "overlay",
        period: 20,
        visible: true,
      },
      {
        id: "wma-20",
        type: "WMA",
        placement: "overlay",
        period: 20,
        visible: true,
      },
      {
        id: "vwap",
        type: "VWAP",
        placement: "overlay",
        visible: true,
      },
    ];

    render(
      <RMSMCandlestickChart
        candles={Array.from({ length: 25 }, (_, index) =>
          candle({
            id: `candle-${index}`,
            eventTime: `2026-08-14T08:${String(index).padStart(2, "0")}:00.000Z`,
            open: String(100 + index),
            high: String(105 + index),
            low: String(95 + index),
            close: String(102 + index),
            volume: "1000",
          }),
        )}
        indicators={indicators}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(4);
    expect(chartState.setData).toHaveBeenCalledTimes(4);
  });

  it("renders Bollinger Bands as three overlay lines", () => {
    const indicators: IndicatorConfig[] = [
      {
        id: "bollinger-20",
        type: "BOLLINGER",
        placement: "overlay",
        period: 20,
        standardDeviations: 2,
        visible: true,
      },
    ];

    render(
      <RMSMCandlestickChart
        candles={Array.from({ length: 25 }, (_, index) =>
          candle({
            id: `candle-${index}`,
            eventTime: `2026-08-14T08:${String(index).padStart(2, "0")}:00.000Z`,
            open: String(100 + index),
            high: String(105 + index),
            low: String(95 + index),
            close: String(102 + index),
            volume: "1000",
          }),
        )}
        indicators={indicators}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(4);
    expect(chartState.setData).toHaveBeenCalledTimes(4);
  });

  it("ignores hidden and pane indicators", () => {
    const indicators: IndicatorConfig[] = [
      {
        id: "sma-20",
        type: "SMA",
        placement: "overlay",
        period: 20,
        visible: false,
      },
      {
        id: "rsi-14",
        type: "RSI",
        placement: "pane",
        period: 14,
        visible: true,
      },
    ];

    render(
      <RMSMCandlestickChart
        candles={Array.from({ length: 25 }, (_, index) =>
          candle({
            id: `candle-${index}`,
            eventTime: `2026-08-14T08:${String(index).padStart(2, "0")}:00.000Z`,
            open: String(100 + index),
            high: String(105 + index),
            low: String(95 + index),
            close: String(102 + index),
            volume: "1000",
          }),
        )}
        indicators={indicators}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(1);
    expect(chartState.setData).toHaveBeenCalledTimes(2);
  });

  it("removes existing overlay series when indicators change", () => {
    const indicators: IndicatorConfig[] = [
      {
        id: "sma-20",
        type: "SMA",
        placement: "overlay",
        period: 20,
        visible: true,
      },
    ];

    const { rerender } = render(
      <RMSMCandlestickChart
        candles={Array.from({ length: 25 }, (_, index) =>
          candle({
            id: `candle-${index}`,
            eventTime: `2026-08-14T08:${String(index).padStart(2, "0")}:00.000Z`,
            open: String(100 + index),
            high: String(105 + index),
            low: String(95 + index),
            close: String(102 + index),
            volume: "1000",
          }),
        )}
        indicators={indicators}
      />,
    );

    rerender(
      <RMSMCandlestickChart
        candles={Array.from({ length: 25 }, (_, index) =>
          candle({
            id: `candle-${index}`,
            eventTime: `2026-08-14T08:${String(index).padStart(2, "0")}:00.000Z`,
            open: String(100 + index),
            high: String(105 + index),
            low: String(95 + index),
            close: String(102 + index),
            volume: "1000",
          }),
        )}
        indicators={[]}
      />,
    );

    expect(chartState.addSeries).toHaveBeenCalledTimes(2);
    expect(chartState.removeSeries).toHaveBeenCalledTimes(1);
    expect(chartState.remove).toHaveBeenCalledTimes(0);
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

describe("candle OHLC hover", () => {
  it("shows the hovered candle OHLC values", () => {
    render(
      <RMSMCandlestickChart
        candles={[
          candle({
            open: "29105.80",
            high: "29118.40",
            low: "29100.20",
            close: "29114.40",
          }),
        ]}
        pricePrecision={2}
      />,
    );

    const chartRoot =
      screen.getByTestId("rmsm-candlestick-chart");

    const container =
      chartRoot.firstElementChild as HTMLElement;

    expect(container).toBeTruthy();

    vi.spyOn(
      container,
      "getBoundingClientRect",
    ).mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 500,
      width: 800,
      height: 500,
      toJSON: () => {},
    });

    const event = new Event("pointermove", {
      bubbles: true,
      cancelable: true,
    });

    Object.defineProperties(event, {
      clientX: { value: 100 },
      clientY: { value: 100 },
      pointerId: { value: 1 },
    });

    act(() => {
      container.dispatchEvent(event);
    });

    const ohlc = screen.getByTestId(
      "chart-crosshair-ohlc",
    );

    expect(ohlc).toHaveTextContent("O 29105.80");
    expect(ohlc).toHaveTextContent("H 29118.40");
    expect(ohlc).toHaveTextContent("L 29100.20");
    expect(ohlc).toHaveTextContent("C 29114.40");
  });
});

describe("MKT-UI-018 keyboard behavior", () => {
  function createDrawingStateFixture(
    overrides: Partial<DrawingState> = {},
  ): DrawingState {
    const drawing = createDrawing(
      "TREND_LINE",
      [
        { time: 1, price: 100 },
        { time: 2, price: 110 },
      ],
      {
        id: "keyboard-drawing-1",
      },
    );

    return {
      ...createDrawingState("SELECT"),
      drawings: [drawing],
      selectedDrawingId: drawing.id,
      ...overrides,
    };
  }

  it.each([
    "PARALLEL_CHANNEL",
    "PRICE_CHANNEL",
    "REGRESSION_CHANNEL",
  ] as const)(
    "creates %s from three chart clicks",
    (tool) => {
      const onDrawingStateChange = vi.fn();

      render(
        <RMSMCandlestickChart
          candles={[candle()]}
          height={500}
          activeDrawingTool={tool}
          onDrawingStateChange={onDrawingStateChange}
        />,
      );

      const subscribeClick =
        chartState.subscribeClick.mock.calls[0]?.[0];

      expect(subscribeClick).toBeTypeOf("function");

      subscribeClick({
        point: { x: 100, y: 100 },
      });

      subscribeClick({
        point: { x: 200, y: 200 },
      });

      subscribeClick({
        point: { x: 300, y: 150 },
      });

      const calls = onDrawingStateChange.mock.calls;
      const nextState =
        calls[calls.length - 1]?.[0] as DrawingState;

      expect(nextState.drawings).toHaveLength(1);
      expect(nextState.drawings[0]?.type).toBe(tool);
      expect(nextState.drawings[0]?.points).toEqual([
        { time: 1, price: 100 },
        { time: 1, price: 200 },
        { time: 1, price: 150 },
      ]);
    },
  );

  function renderKeyboardChart(
    state: DrawingState,
    onDrawingStateChange: (nextState: DrawingState) => void,
  ) {
    render(
      <RMSMCandlestickChart
        candles={[candle()]}
        height={500}
        activeDrawingTool="SELECT"
        drawingState={state}
        onDrawingStateChange={onDrawingStateChange}
      />,
    );

    return screen.getByTestId("rmsm-candlestick-chart");
  }

  it.each([
    ["ABCD", 4],
    ["XABCD", 5],
    ["HEAD_SHOULDERS", 5],
    ["TRIANGLE", 4],
    ["WEDGE", 4],
  ] as const)(
    "creates %s through the chart click path",
    (tool, clickCount) => {
      const onDrawingStateChange = vi.fn();

      render(
        <RMSMCandlestickChart
          candles={[candle()]}
          height={500}
          activeDrawingTool={tool}
          onDrawingStateChange={onDrawingStateChange}
        />,
      );

      expect(
        screen.getByTestId("rmsm-candlestick-chart"),
      ).toBeInTheDocument();

      const subscribeClick =
        chartState.subscribeClick.mock.calls.at(-1)?.[0];

      expect(subscribeClick).toBeTypeOf("function");

      for (let index = 0; index < clickCount; index += 1) {
        subscribeClick({
          point: {
            x: 100 + index * 100,
            y: 100 + index * 20,
          },
        });
      }

      expect(onDrawingStateChange).toHaveBeenCalled();

      const calls = onDrawingStateChange.mock.calls;
      const finalState =
        calls[calls.length - 1]?.[0];

      expect(finalState.drawings).toHaveLength(1);
      expect(finalState.drawings[0]?.type).toBe(tool);
      expect(finalState.drawings[0]?.points).toHaveLength(
        clickCount,
      );
    },
  );

  it.each([
    ["TREND_LINE", 2],
    ["RAY", 2],
    ["HORIZONTAL_LINE", 1],
    ["VERTICAL_LINE", 1],
    ["RECTANGLE", 2],
    ["ARROW", 2],
    ["TEXT", 1],
    ["FORECAST", 2],
    ["PROJECTION", 2],
    ["MEASURE_PRICE", 2],
    ["MEASURE_TIME", 2],
    ["MEASURE_PRICE_TIME", 2],
    ["MEASURE_RANGE", 2],
  ] as const)(
    "creates %s through the chart click path",
    (tool, clickCount) => {
      const onDrawingStateChange = vi.fn();

      render(
        <RMSMCandlestickChart
          candles={[candle()]}
          height={500}
          activeDrawingTool={tool}
          onDrawingStateChange={onDrawingStateChange}
        />,
      );

      const subscribeClick =
        chartState.subscribeClick.mock.calls.at(-1)?.[0];

      expect(subscribeClick).toBeTypeOf("function");

      for (let index = 0; index < clickCount; index += 1) {
        subscribeClick({
          point: {
            x: 100 + index * 100,
            y: 100 + index * 20,
          },
        });
      }

      expect(onDrawingStateChange).toHaveBeenCalled();

      const calls = onDrawingStateChange.mock.calls;
      const finalState =
        calls[calls.length - 1]?.[0];

      expect(finalState.drawings).toHaveLength(1);
      expect(finalState.drawings[0]?.type).toBe(tool);
      expect(finalState.drawings[0]?.points).toHaveLength(
        clickCount,
      );
    },
  );

  it("deletes the selected drawing with Delete", () => {
    const state = createDrawingStateFixture();
    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "Delete",
    });

    expect(onDrawingStateChange).toHaveBeenCalledTimes(1);

    const nextState =
      onDrawingStateChange.mock.calls[0]?.[0];

    expect(nextState.drawings).toHaveLength(0);
    expect(nextState.selectedDrawingId).toBeNull();
  });

  it("deletes the selected drawing with Backspace", () => {
    const state = createDrawingStateFixture();
    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "Backspace",
    });

    expect(onDrawingStateChange).toHaveBeenCalledTimes(1);

    const nextState =
      onDrawingStateChange.mock.calls[0]?.[0];

    expect(nextState.drawings).toHaveLength(0);
    expect(nextState.selectedDrawingId).toBeNull();
  });

  it("clears the selected drawing with Escape", () => {
    const state = createDrawingStateFixture();
    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "Escape",
    });

    expect(onDrawingStateChange).toHaveBeenCalledTimes(1);

    const nextState =
      onDrawingStateChange.mock.calls[0]?.[0];

    expect(nextState.drawings).toHaveLength(1);
    expect(nextState.selectedDrawingId).toBeNull();
  });

  it("moves the selected drawing with ArrowRight", () => {
    const state = createDrawingStateFixture();
    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "ArrowRight",
    });

    expect(onDrawingStateChange).toHaveBeenCalledTimes(1);

    const nextState =
      onDrawingStateChange.mock.calls[0]?.[0];

    expect(nextState.drawings[0]?.points[0]?.time).toBe(2);
    expect(nextState.drawings[0]?.points[1]?.time).toBe(3);
  });

  it("moves the selected drawing with ArrowUp", () => {
    const state = createDrawingStateFixture();
    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "ArrowUp",
    });

    expect(onDrawingStateChange).toHaveBeenCalledTimes(1);

    const nextState =
      onDrawingStateChange.mock.calls[0]?.[0];

    expect(nextState.drawings[0]?.points[0]?.price).toBe(101);
    expect(nextState.drawings[0]?.points[1]?.price).toBe(111);
  });

  it("does not modify a locked drawing", () => {
    const state = createDrawingStateFixture({
      drawings: [
        createDrawing(
          "TREND_LINE",
          [
            { time: 1, price: 100 },
            { time: 2, price: 110 },
          ],
          {
            id: "locked-drawing-1",
            locked: true,
          },
        ),
      ],
      selectedDrawingId: "locked-drawing-1",
    });

    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "Delete",
    });

    expect(onDrawingStateChange).toHaveBeenCalledTimes(1);

    const nextState =
      onDrawingStateChange.mock.calls[0]?.[0];

    expect(nextState.drawings).toHaveLength(1);
    expect(nextState.drawings[0]?.locked).toBe(true);
    expect(nextState.selectedDrawingId).toBe(
      "locked-drawing-1",
    );
  });

  it("ignores keyboard actions when there is no selection", () => {
    const state = createDrawingStateFixture({
      selectedDrawingId: null,
    });

    const onDrawingStateChange = vi.fn();

    const container = renderKeyboardChart(
      state,
      onDrawingStateChange,
    );

    fireEvent.keyDown(container, {
      key: "Delete",
    });

    expect(onDrawingStateChange).not.toHaveBeenCalled();
  });
});
