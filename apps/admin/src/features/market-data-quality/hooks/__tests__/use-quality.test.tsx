import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useQualitySummary } from "../use-quality";

describe("use-quality hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useQualitySummary fetches /market-data/quality/summary and returns average scores + issue counts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ averageScores: { avgQualityScore: 0.92, avgConfidenceScore: 0.88 }, issuesByStatus: { FLAGGED: 3, CORRECTED: 1 } }),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useQualitySummary(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/market-data/quality/summary");
    expect(result.current.data?.averageScores.avgQualityScore).toBe(0.92);
    expect(result.current.data?.issuesByStatus.FLAGGED).toBe(3);
  });
});
