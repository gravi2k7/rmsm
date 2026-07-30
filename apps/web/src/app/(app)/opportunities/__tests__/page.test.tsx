import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import OpportunityFeedPage from "../page";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  return renderWithQueryClient(<OpportunityFeedPage />);
}

const SAMPLE_OPPORTUNITY = {
  id: "opp-1",
  symbolCode: "EURUSD",
  strategyId: "strategy-1",
  status: "CONFIRMED",
  signalDirection: "BUY",
  signalStrength: "STRONG",
  confidenceScore: 88,
  trend: "UP",
  volatility: "MEDIUM",
  liquidity: "HIGH",
  createdAt: "2026-07-20T00:00:00.000Z",
  expiresAt: "2026-07-21T00:00:00.000Z",
};

describe("OpportunityFeedPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders opportunities from the real endpoint shape", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [SAMPLE_OPPORTUNITY], total: 1, page: 1, pageSize: 500 })));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("EURUSD")).toBeInTheDocument();
    });
    expect(screen.getByText("Buy")).toBeInTheDocument();
    expect(screen.getByText("HIGH")).toBeInTheDocument(); // derived priority badge
  });

  it("shows an empty state when there are no opportunities", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, pageSize: 500 })));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no opportunities match/i)).toBeInTheDocument();
    });
  });

  it("shows an error state when the endpoint fails", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: { message: "boom" } }, 500)));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/couldn't load opportunities/i)).toBeInTheDocument();
    });
  });
});
