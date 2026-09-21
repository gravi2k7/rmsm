import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi } from "vitest";

import AnalyticsCenterPage from "../page";
import { useSessionStore } from "@/lib/session-store";

const mocks = vi.hoisted(() => ({
  getTradingAccounts: vi.fn(),
  getTradingTrades: vi.fn(),
  useInstrumentsBatch: vi.fn(),
}));

vi.mock("@/features/trading/api/trading-api", () => ({
  getTradingAccounts: mocks.getTradingAccounts,
  getTradingTrades: mocks.getTradingTrades,
}));

vi.mock("@/features/market/hooks/use-market-data", () => ({
  useInstrumentsBatch: mocks.useInstrumentsBatch,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AnalyticsCenterPage />
    </QueryClientProvider>,
  );
}

describe("Analytics Center", () => {
  beforeEach(() => {
    useSessionStore.setState({
      organizationId: "org-1",
      accessToken: "token-1",
    });

    mocks.getTradingAccounts.mockResolvedValue([
      {
        id: "account-1",
        organizationId: "org-1",
        ownerUserId: "user-1",
        type: "DEMO",
        name: "Demo Account",
        currency: "USD",
        startingBalance: "100000",
        balance: "100000",
        status: "ACTIVE",
        brokerConnectionId: null,
        brokerAccountId: null,
        createdAt: "2026-08-29T00:00:00.000Z",
        updatedAt: "2026-08-29T00:00:00.000Z",
        closedAt: null,
      },
    ]);

    mocks.getTradingTrades.mockResolvedValue([
      {
        id: "trade-win",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "LONG",
        quantity: "10",
        entryPrice: "100",
        exitPrice: "110",
        realizedPnl: "100",
        openedAt: "2026-08-28T10:00:00.000Z",
        closedAt: "2026-08-28T10:30:00.000Z",
      },
      {
        id: "trade-loss",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "SHORT",
        quantity: "5",
        entryPrice: "100",
        exitPrice: "110",
        realizedPnl: "-50",
        openedAt: "2026-08-29T10:00:00.000Z",
        closedAt: "2026-08-29T11:00:00.000Z",
      },
    ]);

    mocks.useInstrumentsBatch.mockReturnValue({
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
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("loads real trading trades into the analytics metrics", async () => {
    renderPage();

    expect(
      await screen.findByText("Analytics"),
    ).toBeInTheDocument();

    expect(
      await screen.findByText("50.0%"),
    ).toBeInTheDocument();

    const profitFactorCard =
      screen.getByText("Profit Factor").closest("div.rounded-xl");

    expect(profitFactorCard).not.toBeNull();

    expect(profitFactorCard).toHaveTextContent("2.00");

    expect(
      screen.getByText("$50.00"),
    ).toBeInTheDocument();


    expect(
      screen.getByText("2 closed trades"),
    ).toBeInTheDocument();
  });

  it("uses the active Demo account and requests its trades", async () => {
    renderPage();

    await waitFor(() => {
      expect(mocks.getTradingTrades).toHaveBeenCalledWith(
        "org-1",
        "account-1",
      );
    });

    expect(mocks.getTradingAccounts).toHaveBeenCalledWith(
      "org-1",
    );
  });

  it("does not include open trades in analytics", async () => {
    mocks.getTradingTrades.mockResolvedValueOnce([
      {
        id: "closed-trade",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "LONG",
        quantity: "10",
        entryPrice: "100",
        exitPrice: "110",
        realizedPnl: "100",
        openedAt: "2026-08-29T10:00:00.000Z",
        closedAt: "2026-08-29T11:00:00.000Z",
      },
      {
        id: "open-trade",
        accountId: "account-1",
        instrumentId: "instrument-1",
        side: "LONG",
        quantity: "10",
        entryPrice: "100",
        exitPrice: "105",
        realizedPnl: "50",
        openedAt: "2026-08-29T12:00:00.000Z",
        closedAt: null,
      },
    ]);

    renderPage();

    expect(
      await screen.findByText("100.0%"),
    ).toBeInTheDocument();

    expect(
      screen.getByText("1 trades"),
    ).toBeInTheDocument();
  });
});
