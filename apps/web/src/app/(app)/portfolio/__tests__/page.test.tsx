import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import PortfolioCenterPage from "../page";
import { useAuthStore } from "@/lib/auth-store";

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
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/portfolio")) {
          return jsonResponse({ id: "pf1", cashBalance: 5000, equity: 20000, buyingPower: 40000, marginUsed: 1000, marginAvailable: 39000, openPositionCount: 1, closedPositionCount: 2, createdAt: "2026-01-01T00:00:00.000Z" });
        }
        if (url.includes("/positions")) {
          return jsonResponse({
            items: [{ id: "p1", symbolCode: "EURUSD", side: "LONG", status: "OPEN", quantityUnits: 10000, averageEntryPrice: 1.1, openedAt: "2026-07-19T00:00:00.000Z" }],
            total: 1,
            page: 1,
            pageSize: 500,
          });
        }
        return jsonResponse({ items: [], total: 0, page: 1, pageSize: 500 });
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("$20,000.00")).toBeInTheDocument();
    });
    expect(screen.getByText(/open positions \(1\)/i)).toBeInTheDocument();
  });
});
