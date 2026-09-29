import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";

vi.mock("@/features/market/hooks/use-market-realtime", () => ({
  useMarketRealtime: () => ({
    liveCandle: null,
    liveQuote: null,
    liveDepth: null,
    liveQuotes: {},
  }),
}));

vi.mock("@/features/market/components/rmsm-candlestick-chart", () => ({
  RMSMCandlestickChart: () => (
    <div data-testid="mock-market-chart">Mock Market Chart</div>
  ),
}));

vi.mock("@/features/market/components/mobile-market-watch", () => ({
  MobileMarketWatch: () => (
    <div data-testid="mock-mobile-market-watch">Mock Mobile Market Watch</div>
  ),
}));

import MarketWatchPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useWatchlistStore } from "@/features/watchlists/store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderMarketWatch() {
  return renderWithQueryClient(<MarketWatchPage />);
}

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

describe("MarketWatchPage", () => {
  beforeEach(() => {
    useWatchlistStore.setState({
      watchlists: [{ id: "default", name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: null,
      favoriteInstrumentIds: [],
      pinnedInstrumentIds: [],
      recentInstrumentIds: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useWatchlistStore.setState({
      watchlists: [{ id: "default", name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: null,
      favoriteInstrumentIds: [],
      pinnedInstrumentIds: [],
      recentInstrumentIds: [],
    });
  });

  it("renders instruments returned by the real market-data endpoint shape", async () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        console.log("[MARKET TEST FETCH]", url);
        if (
          url.includes("/market-data/instruments?") ||
          url.endsWith("/market-data/instruments")
        ) {
          return jsonResponse({
            data: [SAMPLE_INSTRUMENT],
            pagination: {
              page: 1,
              pageSize: 25,
              totalCount: 1,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }
        if (url.includes("/market-data/quotes")) {
          return jsonResponse([{ id: "q1", instrumentId: "instr-1", bidPrice: "1.1", askPrice: "1.1002", lastPrice: "1.1001", eventTime: "2026-07-20T00:00:00.000Z", providerId: "p1", source: "PROVIDER" }]);
        }
        return jsonResponse({});
      }),
    );

    renderMarketWatch();

    await waitFor(() => {
      expect(screen.getAllByText("EURUSD").length).toBeGreaterThan(0);
    });
  });

  it("renders the compact market workstation", async () => {
    useAuthStore.setState({
      accessToken: "token",
      refreshToken: "refresh",
      user: null,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        console.log("[MARKET TEST FETCH]", url);

        if (url.includes("/market-data/instruments")) {
          return jsonResponse({
            data: [SAMPLE_INSTRUMENT],
            pagination: {
              page: 1,
              pageSize: 25,
              totalCount: 1,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }

        if (url.includes("/market-data/quotes")) {
          return jsonResponse([
            {
              id: "q1",
              instrumentId: "instr-1",
              bidPrice: "1.1",
              askPrice: "1.1002",
              lastPrice: "1.1001",
              eventTime: "2026-07-20T00:00:00.000Z",
              providerId: "p1",
              source: "PROVIDER",
            },
          ]);
        }

        if (url.includes("/market-data/candles")) {
          return jsonResponse([]);
        }

        return jsonResponse({});
      }),
    );

    renderMarketWatch();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Markets" })).toBeInTheDocument();
      expect(
        screen.getByText(
          "Real-time prices across global markets. Add to your watchlist and trade instantly.",
        ),
      ).toBeInTheDocument();

      expect(screen.getByText("All Markets")).toBeInTheDocument();
      expect(screen.getByText("Major Pairs")).toBeInTheDocument();
      expect(screen.getByText("All Asset Classes")).toBeInTheDocument();
      expect(screen.getByText("All Status")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();

      expect(screen.getAllByText("EURUSD").length).toBeGreaterThan(0);
    });
  });

  it("keeps market workstation available when instruments fail", async () => {
    useAuthStore.setState({
      accessToken: "token",
      refreshToken: "refresh",
      user: null,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        console.log("[MARKET TEST FETCH]", url);
        if (url.includes("/market-data/instruments")) {
          return jsonResponse(
            { error: { message: "instrument failure" } },
            500,
          );
        }

        if (
          url.includes("/markets?pageSize=100") ||
          url.includes("/market-data/status")
        ) {
          return jsonResponse({
            items: [
              {
                id: "exchange-1",
                name: "London Stock Exchange",
                isOpen: false,
              },
            ],
          });
        }

        return jsonResponse([]);
      }),
    );

    renderMarketWatch();

    await waitFor(() => {
      expect(
        screen.getByText(/couldn't load instruments/i),
      ).toBeInTheDocument();
    });

  });

  it("shows an error state when instruments fail to load", async () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { message: "boom" } }, 500)));

    renderMarketWatch();

    await waitFor(() => {
      expect(screen.getByText(/couldn't load instruments/i)).toBeInTheDocument();
    });
  });
});
