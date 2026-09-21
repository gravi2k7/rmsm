import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import PortfolioCenterPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  return renderWithQueryClient(<PortfolioCenterPage />);
}

describe("PortfolioCenterPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders account equity and open positions from real endpoint data", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    useSessionStore.setState({
      organizationId: "org-1",
      accessToken: "t",
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        const pathname = new URL(url, "http://localhost").pathname;

        if (/\/trading-accounts\/[^/]+\/positions\/?$/.test(pathname)) {
          return jsonResponse([
            {
              id: "p1",
              accountId: "account-1",
              instrumentId: "instrument-1",
              side: "LONG",
              quantity: "10000",
              averageEntryPrice: "1.1",
              stopLossPrice: null,
              takeProfitPrice: null,
              status: "OPEN",
              openedAt: "2026-07-19T00:00:00.000Z",
              closedAt: null,
              averageExitPrice: null,
              realizedPnl: null,
            },
          ]);
        }

        if (/\/trading-accounts\/[^/]+\/trades\/?$/.test(pathname)) {
          return jsonResponse([]);
        }

        if (/\/trading-accounts\/?$/.test(pathname)) {
          return jsonResponse([
            {
              id: "account-1",
              organizationId: "org-1",
              ownerUserId: "user-1",
              type: "DEMO",
              name: "Demo Account",
              currency: "USD",
              startingBalance: "20000",
              balance: "20000",
              status: "ACTIVE",
              brokerConnectionId: null,
              brokerAccountId: null,
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
              closedAt: null,
            },
          ]);
        }

        if (pathname.includes("/market-data/quotes")) {
          return jsonResponse([]);
        }

        if (pathname.includes("/market-data/instruments/batch")) {
          return jsonResponse([
            {
              id: "instrument-1",
              symbol: "EURUSD",
              name: "Euro / US Dollar",
              assetClass: "FOREX",
              currency: "USD",
              status: "ACTIVE",
            },
          ]);
        }

        return jsonResponse({
          items: [],
          total: 0,
          page: 1,
          pageSize: 500,
        });
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText("$20,000.00").length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(
        screen.getByText(/open positions \(1\)/i),
      ).toBeInTheDocument();
    });
  });
});
