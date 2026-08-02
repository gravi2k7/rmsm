import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useGaps, useGapStatistics, useDetectGaps, useRepairGap } from "../use-gaps";

describe("use-gaps hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useGaps fetches /market-data/gaps filtered by status", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "g1", status: "DETECTED" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGaps("DETECTED"), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/market-data/gaps?status=DETECTED");
  });

  it("useGapStatistics fans out over all 5 known gap statuses and aggregates counts", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      const status = new URL(url, "http://localhost").searchParams.get("status");
      const body = status === "DETECTED" ? [{ id: "g1" }, { id: "g2" }] : [];
      return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useGapStatistics(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchMock).toHaveBeenCalledTimes(5);
    expect(result.current.counts.DETECTED).toBe(2);
    expect(result.current.counts.RESOLVED).toBe(0);
  });

  it("useDetectGaps POSTs to /market-data/gaps/detect", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDetectGaps(), { wrapper: withQueryClient() });
    await result.current.mutateAsync({ instrumentId: "i1", interval: "ONE_DAY", from: "2024-01-01T00:00:00.000Z", to: "2024-02-01T00:00:00.000Z" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/market-data/gaps/detect");
    expect(init.method).toBe("POST");
  });

  it("useRepairGap POSTs to /market-data/gaps/:id/repair", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "g1", status: "BACKFILLING" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useRepairGap(), { wrapper: withQueryClient() });
    await result.current.mutateAsync("g1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/market-data/gaps/g1/repair");
    expect(init.method).toBe("POST");
  });
});
