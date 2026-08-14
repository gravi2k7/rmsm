import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import InstrumentChartPage from "../page";

const useInstrumentMock = vi.fn();
const useQuotesMock = vi.fn();
const useCandlesMock = vi.fn();

vi.mock("next/navigation", () => ({
  useParams: () => ({ instrumentId: "instr-1" }),
}));

vi.mock("@/features/market/hooks/use-market-data", () => ({
  useInstrument: (...args: unknown[]) => useInstrumentMock(...args),
  useQuotes: (...args: unknown[]) => useQuotesMock(...args),
  useCandles: (...args: unknown[]) => useCandlesMock(...args),
}));

vi.mock("@/features/market/components/rmsm-candlestick-chart", () => ({
  RMSMCandlestickChart: ({
    candles,
    height,
  }: {
    candles: unknown[];
    height: number;
  }) => (
    <div
      data-testid="rmsm-candlestick-chart"
      data-candle-count={candles.length}
      data-height={height}
    />
  ),
}));

const SAMPLE_INSTRUMENT = {
  id: "instr-1",
  exchangeId: "ex-1",
  symbol: "EURUSD",
  name: "Euro / US Dollar",
  assetClass: "FOREX",
  status: "ACTIVE",
  currency: "USD",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const SAMPLE_QUOTE = {
  id: "quote-1",
  instrumentId: "instr-1",
  bidPrice: "1.10000",
  askPrice: "1.10020",
  lastPrice: "1.10010",
  eventTime: "2026-08-14T09:00:00.000Z",
  providerId: "provider-1",
  source: "PROVIDER",
};

const SAMPLE_CANDLES = [
  {
    id: "candle-1",
    instrumentId: "instr-1",
    interval: "ONE_MINUTE",
    eventTime: "2026-08-14T09:00:00.000Z",
    open: "1.10000",
    high: "1.10020",
    low: "1.09990",
    close: "1.10010",
    volume: "100",
    isCorrection: false,
  },
  {
    id: "candle-2",
    instrumentId: "instr-1",
    interval: "ONE_MINUTE",
    eventTime: "2026-08-14T09:01:00.000Z",
    open: "1.10010",
    high: "1.10030",
    low: "1.10000",
    close: "1.10020",
    volume: "120",
    isCorrection: false,
  },
];

function renderInstrumentChart() {
  return renderWithQueryClient(<InstrumentChartPage />);
}

describe("InstrumentChartPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("passes the selected instrument and initial timeframe to useCandles", async () => {
    useInstrumentMock.mockReturnValue({
      data: SAMPLE_INSTRUMENT,
      isLoading: false,
      isError: false,
    });

    useQuotesMock.mockReturnValue({
      data: [SAMPLE_QUOTE],
      isLoading: false,
      isError: false,
    });

    useCandlesMock.mockReturnValue({
      data: SAMPLE_CANDLES,
      isLoading: false,
      isError: false,
    });

    renderInstrumentChart();

    await waitFor(() => {
      expect(screen.getByText("EURUSD")).toBeInTheDocument();
    });

    expect(useInstrumentMock).toHaveBeenCalledWith("instr-1");
    expect(useQuotesMock).toHaveBeenCalledWith(["instr-1"]);

    const candleParams = useCandlesMock.mock.calls.at(-1)?.[0];

    expect(candleParams).toEqual(
      expect.objectContaining({
        instrumentId: "instr-1",
        interval: "ONE_MINUTE",
        limit: 500,
      }),
    );

    expect(candleParams.from).toEqual(expect.any(String));
    expect(candleParams.to).toEqual(expect.any(String));

    expect(screen.getByTestId("rmsm-candlestick-chart")).toHaveAttribute(
      "data-candle-count",
      "2",
    );

    expect(screen.getByText("1m · 2 candles")).toBeInTheDocument();
  });

  it("changes the candle interval when the 15m timeframe is selected", async () => {
    useInstrumentMock.mockReturnValue({
      data: SAMPLE_INSTRUMENT,
      isLoading: false,
      isError: false,
    });

    useQuotesMock.mockReturnValue({
      data: [SAMPLE_QUOTE],
      isLoading: false,
      isError: false,
    });

    useCandlesMock.mockReturnValue({
      data: SAMPLE_CANDLES,
      isLoading: false,
      isError: false,
    });

    renderInstrumentChart();

    await waitFor(() => {
      expect(screen.getByText("EURUSD")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "15m" }));

    await waitFor(() => {
      const candleParams = useCandlesMock.mock.calls.at(-1)?.[0];

      expect(candleParams).toEqual(
        expect.objectContaining({
          instrumentId: "instr-1",
          interval: "FIFTEEN_MINUTES",
          limit: 500,
        }),
      );
    });

    expect(screen.getByText("15m · 2 candles")).toBeInTheDocument();
  });
});
