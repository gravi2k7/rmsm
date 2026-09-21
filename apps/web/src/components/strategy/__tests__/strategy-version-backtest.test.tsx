import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mutateMock = vi.fn();
const mockCandles = [
  {
    instrumentId: "instrument-1",
    interval: "ONE_MINUTE",
    eventTime: "2026-09-01T00:00:00.000Z",
    open: 99,
    high: 101,
    low: 98,
    close: 100,
    volume: 1000,
  },
];
let candlesParams: unknown = null;
let backtestMarkers: unknown = null;

vi.mock("@/hooks/use-strategy-versions", () => ({
  useRunStrategyVersionBacktest: () => ({
    mutate: mutateMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/features/market/hooks/use-market-data", () => ({
  useCandles: (params: unknown) => {
    candlesParams = params;
    return {
      data: mockCandles,
      isLoading: false,
      isError: false,
    };
  },
  useInstruments: () => ({
    data: {
      data: [
        {
          id: "instrument-1",
          symbol: "EURUSD",
          name: "EUR/USD",
        },
      ],
    },
  }),
  useInstrument: () => ({
    data: {
      id: "instrument-1",
      symbol: "EURUSD",
      name: "EUR/USD",
    },
  }),
}));

vi.mock("@/features/market/components/rmsm-candlestick-chart", () => ({
  RMSMCandlestickChart: (props: {
    backtestMarkers?: unknown;
  }) => {
    backtestMarkers = props.backtestMarkers ?? null;

    return (
      <div data-testid="backtest-chart" />
    );
  },
}));

vi.mock("recharts", () => ({
  Line: () => null,
  LineChart: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="equity-chart">{children}</div>
  ),
  ResponsiveContainer: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div>{children}</div>,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

import { StrategyVersionBacktest } from "../strategy-version-backtest";

const baseProps = {
  versionId: "version-1",
  defaultInstrumentId: "instrument-1",
};

describe("StrategyVersionBacktest", () => {
  beforeEach(() => {
    mutateMock.mockReset();
    candlesParams = null;
    backtestMarkers = null;
  });

  it("renders a generic timeframe for RDSE", () => {
    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE"
      />,
    );

    expect(
      screen.getByLabelText("Backtest timeframe"),
    ).toBeInTheDocument();

    expect(
      screen.queryByLabelText("Backtest higher timeframe"),
    ).not.toBeInTheDocument();

    expect(
      screen.queryByLabelText("Backtest lower timeframe"),
    ).not.toBeInTheDocument();
  });

  it("renders HTF/LTF and hides generic timeframe for RDSE V2", () => {
    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE_V2"
        defaultHtf="ONE_HOUR"
        defaultLtf="FIVE_MINUTES"
      />,
    );

    expect(
      screen.queryByLabelText("Backtest timeframe"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByLabelText("Backtest higher timeframe"),
    ).toBeInTheDocument();

    expect(
      screen.getByLabelText("Backtest lower timeframe"),
    ).toBeInTheDocument();
  });

  it("uses LTF as the V2 backtest interval", () => {
    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE_V2"
        defaultHtf="ONE_HOUR"
        defaultLtf="FIVE_MINUTES"
      />,
    );

    fireEvent.change(
      screen.getByLabelText("Backtest lower timeframe"),
      { target: { value: "FIFTEEN_MINUTES" } },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /run backtest/i,
      }),
    );

    expect(mutateMock).toHaveBeenCalledTimes(1);

    const [request] = mutateMock.mock.calls[0]!;

    expect(request.versionId).toBe("version-1");
    expect(request.input.instrumentId).toBe("instrument-1");
    expect(request.input.interval).toBe(
      "FIFTEEN_MINUTES",
    );
    expect(request.input.htf).toBe("ONE_HOUR");
    expect(request.input.ltf).toBe(
      "FIFTEEN_MINUTES",
    );
  });

  it("enables replay candle loading with the successful backtest range", async () => {
    mutateMock.mockImplementation(
      (
        _request: unknown,
        options?: {
          onSuccess?: (result: unknown) => void;
        },
      ) => {
        options?.onSuccess?.({
          orders: [],
          positions: [],
          equityCurve: [],
          trades: [],
          metrics: {
            startingBalance: 10000,
            endingBalance: 10000,
            netProfit: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: 0,
            grossProfit: 0,
            grossLoss: 0,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
          },
        });
      },
    );

    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE_V2"
        defaultHtf="ONE_HOUR"
        defaultLtf="FIVE_MINUTES"
      />,
    );

    fireEvent.change(
      screen.getByLabelText("Backtest higher timeframe"),
      { target: { value: "FIFTEEN_MINUTES" } },
    );

    fireEvent.change(
      screen.getByLabelText("Backtest lower timeframe"),
      { target: { value: "ONE_MINUTE" } },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /run backtest/i,
      }),
    );

    await waitFor(() => {
      expect(candlesParams).toEqual(
        expect.objectContaining({
          instrumentId: "instrument-1",
          interval: "ONE_MINUTE",
          limit: 5000,
        }),
      );
    });

    expect(candlesParams).toEqual(
      expect.objectContaining({
        from: expect.any(String),
        to: expect.any(String),
      }),
    );
  });

  it("does not send HTF/LTF for RDSE", () => {
    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE"
      />,
    );

    fireEvent.change(
      screen.getByLabelText("Backtest timeframe"),
      { target: { value: "ONE_MINUTE" } },
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /run backtest/i,
      }),
    );

    const call = mutateMock.mock.calls[0];
    expect(call).toBeDefined();

    const [request] = call!;

    expect(request.input.interval).toBe(
      "ONE_MINUTE",
    );
    expect(request.input.htf).toBeUndefined();
    expect(request.input.ltf).toBeUndefined();
  });

  it("passes backtest trade entry and exit markers to the price replay chart", () => {
    mutateMock.mockImplementation(
      (
        _request: unknown,
        options?: {
          onSuccess?: (result: unknown) => void;
        },
      ) => {
        options?.onSuccess?.({
          orders: [],
          positions: [],
          equityCurve: [],
          trades: [
            {
              id: "trade-long",
              instrumentId: "instrument-1",
              side: "LONG",
              quantity: 1,
              entryPrice: 100,
              exitPrice: 110,
              realizedPnl: 10,
              openedAt: "2026-09-01T00:00:00.000Z",
              closedAt: "2026-09-01T01:00:00.000Z",
            },
            {
              id: "trade-short",
              instrumentId: "instrument-1",
              side: "SHORT",
              quantity: 1,
              entryPrice: 120,
              exitPrice: 115,
              realizedPnl: 5,
              openedAt: "2026-09-01T02:00:00.000Z",
              closedAt: "2026-09-01T03:00:00.000Z",
            },
          ],
          metrics: {
            startingBalance: 10000,
            endingBalance: 10015,
            netProfit: 15,
            totalTrades: 2,
            winningTrades: 2,
            losingTrades: 0,
            winRate: 100,
            grossProfit: 15,
            grossLoss: 0,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
          },
        });
      },
    );

    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /run backtest/i,
      }),
    );

    expect(backtestMarkers).toEqual([
      {
        time: "2026-09-01T00:00:00.000Z",
        price: 100,
        side: "LONG",
        event: "ENTRY",
        label: "ENTRY LONG",
      },
      {
        time: "2026-09-01T01:00:00.000Z",
        price: 110,
        side: "LONG",
        event: "EXIT",
        label: "EXIT LONG",
      },
      {
        time: "2026-09-01T02:00:00.000Z",
        price: 120,
        side: "SHORT",
        event: "ENTRY",
        label: "ENTRY SHORT",
      },
      {
        time: "2026-09-01T03:00:00.000Z",
        price: 115,
        side: "SHORT",
        event: "EXIT",
        label: "EXIT SHORT",
      },
    ]);
  });

  it("renders returned backtest metrics and trades using the API result contract", () => {
    mutateMock.mockImplementation(
      (
        _request: unknown,
        options?: {
          onSuccess?: (result: unknown) => void;
        },
      ) => {
        options?.onSuccess?.({
          orders: [],
          positions: [],
          equityCurve: [
            {
              time: "2026-09-01T00:00:00.000Z",
              balance: 10000,
              equity: 10100,
              unrealizedPnl: 100,
            },
          ],
          trades: [
            {
              id: "trade-1",
              instrumentId: "instrument-1",
              side: "LONG",
              quantity: 1,
              entryPrice: 100,
              exitPrice: 110,
              realizedPnl: 10,
              openedAt: "2026-09-01T00:00:00.000Z",
              closedAt: "2026-09-01T01:00:00.000Z",
            },
          ],
          metrics: {
            startingBalance: 10000,
            endingBalance: 10010,
            netProfit: 10,
            totalTrades: 1,
            winningTrades: 1,
            losingTrades: 0,
            winRate: 100,
            grossProfit: 10,
            grossLoss: 0,
            maxDrawdown: 0,
            maxDrawdownPercent: 0,
          },
        });
      },
    );

    render(
      <StrategyVersionBacktest
        {...baseProps}
        runtime="RDSE"
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /run backtest/i,
      }),
    );

    expect(
      screen.getByText("Net Profit")
        .parentElement,
    ).toHaveTextContent("10.00");

    expect(
      screen.getByText("100.0%"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("LONG"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("10.00", {
        selector: "td",
      }),
    ).toBeInTheDocument();

    expect(
      screen.queryByText("NaN"),
    ).not.toBeInTheDocument();

    expect(
      screen.getByTestId("equity-chart"),
    ).toBeInTheDocument();
  });
});
