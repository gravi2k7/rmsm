import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/query-wrapper";
import { useAuthStore } from "@/lib/auth-store";
import MarketDataDashboardPage from "../page";

function routedFetchMock() {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes("/market-data/monitoring/dashboard")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            providerHealth: [{ providerConfigId: "p1", providerType: "TWELVE_DATA", name: "Twelve Data", isActive: true, priority: 1, registered: true, enabled: true, circuitState: "closed", credential: { providerType: "TWELVE_DATA", requirement: "REQUIRED", configured: true } }],
            importJobsByStatus: { RUNNING: 1 },
            gapsByStatus: { DETECTED: 4 },
            qualityIssuesByStatus: { FLAGGED: 2 },
            averageQualityScores: { avgQualityScore: 0.9, avgConfidenceScore: 0.85 },
            storageUsage: [{ tableName: "market_candles", totalBytes: 1024, totalSizePretty: "1 KB" }],
            totalStorageBytes: 1024,
          }),
          { status: 200 },
        ),
      );
    }
    if (url.includes("/market-data/instruments")) {
      return Promise.resolve(new Response(JSON.stringify({ data: [], pagination: { totalCount: 42, page: 1, pageSize: 1 } }), { status: 200 }));
    }
    if (url.includes("/market-data/synchronizations/import-jobs")) {
      return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
    }
    return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
  });
}

describe("MarketDataDashboardPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders real aggregated provider/instrument/storage figures", async () => {
    vi.stubGlobal("fetch", routedFetchMock());

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MarketDataDashboardPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(screen.getByText("Providers Online")).toBeInTheDocument();
    expect(screen.getByText("Total Instruments")).toBeInTheDocument();
    expect(screen.getByText(/no historical trend endpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/no alerting endpoint exists/i)).toBeInTheDocument();
  });
});
