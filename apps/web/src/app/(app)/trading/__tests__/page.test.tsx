import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import TradingPage from "../page";
import { useSessionStore } from "@/lib/session-store";

const mocks = vi.hoisted(() => ({
  getTradingAccounts: vi.fn(),
  getTradingAccount: vi.fn(),
  getTradingPositions: vi.fn(),
  getTradingOrders: vi.fn(),
  getTradingTrades: vi.fn(),
  placePaperOrder: vi.fn(),
  useInstrument: vi.fn(),
  useInstruments: vi.fn(),
  useInstrumentsBatch: vi.fn(),
  useCandles: vi.fn(),
  useQuotes: vi.fn(),
  useMarketRealtime: vi.fn(),
  getTradingLedger: vi.fn(),
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.routerPush,
    replace: mocks.routerReplace,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: mocks.useSearchParams,
}));

vi.mock("@/features/market/components/rmsm-candlestick-chart", async () => {
  const React = await import("react");

  const RMSMCandlestickChart = React.forwardRef(() => (
    <div data-testid="rmsm-candlestick-chart" />
  ));

  RMSMCandlestickChart.displayName = "RMSMCandlestickChart";

  return { RMSMCandlestickChart };
});

vi.mock("@/features/trading/api/trading-api", () => mocks);

vi.mock("@/features/market/hooks/use-market-data", () => ({
  useInstrument: mocks.useInstrument,
  useInstruments: mocks.useInstruments,
  useInstrumentsBatch: mocks.useInstrumentsBatch,
  useCandles: mocks.useCandles,
  useQuotes: mocks.useQuotes,
}));

vi.mock("@/features/market/hooks/use-market-realtime", () => ({
  useMarketRealtime: mocks.useMarketRealtime,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TradingPage />
    </QueryClientProvider>,
  );
}

describe("Trading page", () => {
  let orderFilled = false;

  beforeEach(() => {
  mocks.useSearchParams.mockReturnValue(new URLSearchParams());

    orderFilled = false;
    mocks.getTradingLedger.mockResolvedValue([
      {
        id: "ledger-1",
        accountId: "account-1",
        type: "TRADE_CREDIT",
        amount: "29038.80",
        balanceAfter: "98461.77",
        reference: "paper-order:order-1",
        metadata: {
          realizedPnl: "9.7",
        },
        createdAt: "2026-08-27T00:00:00.000Z",
      },
    ]);

    useSessionStore.setState({
      organizationId: "org-1",
      accessToken: "token-1",
    });

    mocks.getTradingAccounts.mockImplementation(async () => [
      {
        id: "account-1",
        organizationId: "org-1",
        ownerUserId: "user-1",
        type: "DEMO",
        name: "Demo Account",
        currency: "USD",
        startingBalance: "100000",
        balance: orderFilled ? "98997.5" : "100000",
        status: "ACTIVE",
        brokerConnectionId: null,
        brokerAccountId: null,
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:00:00.000Z",
        closedAt: null,
      },
    ]);

    mocks.getTradingAccount.mockImplementation(async () => ({
      id: "account-1",
      organizationId: "org-1",
      ownerUserId: "user-1",
      type: "DEMO",
      name: "Demo Account",
      currency: "USD",
      startingBalance: "100000",
      balance: orderFilled ? "98997.5" : "100000",
      status: "ACTIVE",
      brokerConnectionId: null,
      brokerAccountId: null,
      createdAt: "2026-08-27T00:00:00.000Z",
      updatedAt: "2026-08-27T00:00:00.000Z",
      closedAt: null,
    }));

    mocks.getTradingPositions.mockImplementation(async () => {
      console.log(
        "GET POSITIONS:",
        "orderFilled=",
        orderFilled,
      );

      return orderFilled
        ? [
            {
              id: "position-1",
              accountId: "account-1",
              instrumentId: "instrument-1",
              side: "LONG",
              quantity: "10",
              averageEntryPrice: "100.25",
              status: "OPEN",
              openedAt: "2026-08-27T00:00:00.000Z",
              closedAt: null,
              averageExitPrice: null,
              realizedPnl: null,
            },
          ]
        : [];
    });

    mocks.getTradingOrders.mockResolvedValue([]);

    mocks.getTradingTrades.mockResolvedValue([]);

    mocks.useCandles.mockReturnValue({
      data: [
        {
          eventTime: "2026-08-27T10:00:00.000Z",
          open: "25000",
          high: "25100",
          low: "24900",
          close: "25050",
          volume: "1000",
        },
        {
          eventTime: "2026-08-27T10:01:00.000Z",
          open: "25050",
          high: "25150",
          low: "25000",
          close: "25100",
          volume: "1100",
        },
      ],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });

    mocks.useInstrument.mockReturnValue({
      data: {
        id: "instrument-1",
        exchangeId: "exchange-1",
        symbol: "EURUSD",
        name: "Euro / US Dollar",
        assetClass: "FOREX",
        status: "ACTIVE",
        currency: "USD",
        isin: null,
        cusip: null,
        tickSize: "0.00001",
        lotSize: "1000",
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:00:00.000Z",
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    mocks.useInstruments.mockReturnValue({
      data: {
        data: [
          {
            id: "instrument-1",
            exchangeId: "exchange-1",
            symbol: "EURUSD",
            name: "Euro / US Dollar",
            assetClass: "FOREX",
            status: "ACTIVE",
            currency: "USD",
            isin: null,
            cusip: null,
            tickSize: "0.00001",
            lotSize: "1000",
            createdAt: "2026-08-27T00:00:00.000Z",
            updatedAt: "2026-08-27T00:00:00.000Z",
          },
        ],
        pagination: {
          page: 1,
          pageSize: 8,
          totalCount: 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
      isLoading: false,
      isError: false,
      error: null,
    });

    mocks.useInstrumentsBatch.mockImplementation((instrumentIds: readonly string[]) => ({
      data: instrumentIds.map((id) => ({
        id,
        exchangeId: "exchange-1",
        symbol: id === "instrument-2" ? "NAS100" : "EURUSD",
        name: id === "instrument-2" ? "NASDAQ 100" : "Euro / US Dollar",
        assetClass: id === "instrument-2" ? "INDEX" : "FOREX",
        status: "ACTIVE",
        currency: "USD",
        isin: null,
        cusip: null,
        tickSize: id === "instrument-2" ? "0.1" : "0.00001",
        lotSize: "1",
        createdAt: "2026-08-27T00:00:00.000Z",
        updatedAt: "2026-08-27T00:00:00.000Z",
      })),
      isLoading: false,
      isError: false,
      error: null,
    }));

    mocks.useQuotes.mockReturnValue({
      data: [
        {
          id: "quote-1",
          instrumentId: "instrument-1",
          bidPrice: "1.10000",
          askPrice: "1.10020",
          lastPrice: "1.10010",
          bidSize: "100000",
          askSize: "100000",
          eventTime: "2026-08-27T00:00:00.000Z",
          providerId: "provider-1",
          source: "LIVE",
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
    });

    mocks.useMarketRealtime.mockReturnValue({
      liveCandle: null,
      liveQuote: {
        id: "quote-1",
        instrumentId: "instrument-1",
        bidPrice: "1.10000",
        askPrice: "1.10020",
        lastPrice: "1.10010",
        bidSize: "100000",
        askSize: "100000",
        eventTime: "2026-08-27T00:00:00.000Z",
        providerId: "provider-1",
        source: "LIVE",
      },
      liveDepth: null,
      liveQuotes: {
        "instrument-1": {
          id: "quote-1",
          instrumentId: "instrument-1",
          bidPrice: "1.10000",
          askPrice: "1.10020",
          lastPrice: "1.10010",
          bidSize: "100000",
          askSize: "100000",
          eventTime: "2026-08-27T00:00:00.000Z",
          providerId: "provider-1",
          source: "LIVE",
        },
      },
    });

    mocks.placePaperOrder.mockImplementation(async () => {
      orderFilled = true;

      return {
      order: {
        id: "order-1",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "BUY",
        type: "MARKET",
        quantity: "10",
        status: "FILLED",
        requestedPrice: null,
        executedPrice: "100.25",
        rejectionReason: null,
        createdAt: "2026-08-27T00:00:00.000Z",
        filledAt: "2026-08-27T00:00:00.000Z",
      },
      position: {
        id: "position-1",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "LONG",
        quantity: "10",
        averageEntryPrice: "100.25",
        status: "OPEN",
        openedAt: "2026-08-27T00:00:00.000Z",
        closedAt: null,
        averageExitPrice: null,
        realizedPnl: null,
      },
      trade: null,
      executedPrice: "100.25",
      realizedPnl: "0",
      balance: "98997.5",
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("uses the instrument from the canonical trading URL", async () => {
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("instrument=instrument-1"),
    );

    renderPage();

    await waitFor(() => {
      expect(mocks.useInstrument).toHaveBeenCalledWith("instrument-1");
    });
  });

  it("loads the Demo account", async () => {
    renderPage();

    expect(
      (await screen.findAllByText("Demo Account")).length,
    ).toBeGreaterThan(0);

    expect(
      (await screen.findAllByText("$100,000.00")).length,
    ).toBeGreaterThan(0);

    expect(
      (await screen.findAllByTestId("rmsm-candlestick-chart")).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Select instrument"),
    ).toBeInTheDocument();
  });

  it("subscribes to all trading instrument quotes independently of the active chart", async () => {
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("instrument=instrument-1"),
    );

    mocks.getTradingPositions.mockResolvedValue([
      {
        id: "position-btc",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "LONG",
        quantity: "1",
        averageEntryPrice: "100000",
        status: "OPEN",
        openedAt: "2026-08-27T00:00:00.000Z",
        closedAt: null,
        averageExitPrice: null,
        realizedPnl: null,
      },
      {
        id: "position-nas100",
        accountId: "account-1",
        instrumentId: "instrument-2",
        side: "SHORT",
        quantity: "10",
        averageEntryPrice: "29800",
        status: "OPEN",
        openedAt: "2026-08-27T00:00:00.000Z",
        closedAt: null,
        averageExitPrice: null,
        realizedPnl: null,
      },
      {
        id: "position-eurusd",
        accountId: "account-1",
        instrumentId: "instrument-3",
        side: "LONG",
        quantity: "10",
        averageEntryPrice: "1.14764",
        status: "OPEN",
        openedAt: "2026-08-27T00:00:00.000Z",
        closedAt: null,
        averageExitPrice: null,
        realizedPnl: null,
      },
    ]);

    mocks.getTradingOrders.mockResolvedValue([]);
    mocks.getTradingTrades.mockResolvedValue([]);

    renderPage();

    await waitFor(() => {
      const calls = mocks.useMarketRealtime.mock.calls;

      expect(
        calls.some((call) => {
          const ids = call[2] as readonly string[] | undefined;

          return (
            call[0] === "instrument-1" &&
            ids?.includes("instrument-1") &&
            ids?.includes("instrument-2") &&
            ids?.includes("instrument-3")
          );
        }),
      ).toBe(true);
    });

    const calls = mocks.useMarketRealtime.mock.calls;

    const populatedCall = calls.find((call) => {
      const ids = call[2] as readonly string[] | undefined;

      return (
        call[0] === "instrument-1" &&
        ids?.includes("instrument-1") &&
        ids?.includes("instrument-2") &&
        ids?.includes("instrument-3")
      );
    });

    expect(populatedCall).toBeDefined();

    const realtimeInstrumentIds = populatedCall?.[2] as readonly string[];

    expect(new Set(realtimeInstrumentIds).size).toBe(
      realtimeInstrumentIds.length,
    );
  });

  it("resolves symbols for instruments other than the selected chart instrument", async () => {
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("instrument=instrument-1"),
    );

    mocks.getTradingTrades.mockResolvedValue([
      {
        id: "trade-2",
        accountId: "account-1",
        instrumentId: "instrument-2",
        side: "LONG",
        quantity: "1",
        entryPrice: "20000",
        exitPrice: "20100",
        realizedPnl: "100",
        closedAt: "2026-08-27T00:00:00.000Z",
      },
    ]);

    renderPage();

    await waitFor(() => {
      const batchCalls = mocks.useInstrumentsBatch.mock.calls;

      expect(
        batchCalls.some((call) =>
          (call[0] as readonly string[]).includes("instrument-2"),
        ),
      ).toBe(true);
    });

    const batchIds = mocks.useInstrumentsBatch.mock.calls
      .flatMap((call) => call[0] as readonly string[]);

    expect(batchIds).toContain("instrument-1");
    expect(batchIds).toContain("instrument-2");

    const tradesTab = screen.getByRole("button", {
      name: "Trades",
    });

    await userEvent.click(tradesTab);

    expect(screen.getByText("NAS100")).toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
  });

  it("submits a paper BUY order", async () => {
    const user = userEvent.setup();

    renderPage();

    await screen.findAllByText("Demo Account");

    await user.click(
      screen.getByRole("button", { name: "Select instrument" }),
    );

    const instrumentSearch =
      await screen.findByTestId("instrument-search");

    await user.type(
      instrumentSearch,
      "EUR",
    );

    const instrumentOption = await screen.findByRole(
      "menuitem",
      { name: /EURUSD.*Euro \/ US Dollar/i },
    );

    await user.click(instrumentOption);

    const tradeTab = screen.getByRole("button", {
      name: "Trade",
    });

    expect(
      screen.getByRole("button", { name: "Chart" }),
    ).toHaveAttribute("aria-current", "page");

    expect(tradeTab).not.toHaveAttribute("aria-current", "page");

    await user.click(tradeTab);

    const tradeTabAfterClick = screen.getByRole("button", {
      name: "Trade",
    });

    console.log(
      "TRADE TAB AFTER CLICK:",
      tradeTabAfterClick.getAttribute("aria-current"),
    );

    console.log(
      "CHART TAB AFTER CLICK:",
      screen
        .getByRole("button", { name: "Chart" })
        .getAttribute("aria-current"),
    );

    expect(tradeTabAfterClick).toHaveAttribute("aria-current", "page");

    expect(
      await screen.findByText("BID", { exact: true }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("1.10000", { exact: true }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("ASK", { exact: true }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("1.10020", { exact: true }),
    ).toBeInTheDocument();

    const quantity = screen.getByLabelText("Quantity");
    await user.clear(quantity);
    await user.type(quantity, "10");

    await user.click(
      screen.getByRole("button", { name: "Buy EURUSD" }),
    );

    await waitFor(() => {
      expect(mocks.placePaperOrder).toHaveBeenCalledWith(
        "org-1",
        "account-1",
        {
          instrumentId: "instrument-1",
          side: "BUY",
          quantity: "10",
          type: "MARKET",
        },
      );
    });

    const mobileOrdersTab = screen
      .getAllByRole("button", { name: "Orders" })
      .find(
        (button) =>
          !button.hasAttribute("aria-pressed"),
      );

    if (!mobileOrdersTab) {
      throw new Error("Mobile Orders tab not found");
    }

    await user.click(mobileOrdersTab);

    expect(
      (await screen.findAllByText("100.25000")).length,
    ).toBeGreaterThan(0);

    expect(
      (await screen.findAllByText("$98,997.50")).length,
    ).toBeGreaterThan(0);
  });
});
