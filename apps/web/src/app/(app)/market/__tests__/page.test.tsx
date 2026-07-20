import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MarketWatchPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useWatchlistStore } from "@/features/watchlists/store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderMarketWatch() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MarketWatchPage />
    </QueryClientProvider>,
  );
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
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useWatchlistStore.setState({
      watchlists: [{ id: "default", name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: "default",
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
        if (url.includes("/market-data/instruments")) {
          return jsonResponse({
            data: [SAMPLE_INSTRUMENT],
            pagination: { page: 1, pageSize: 25, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
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
      expect(screen.getByText("EURUSD")).toBeInTheDocument();
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
