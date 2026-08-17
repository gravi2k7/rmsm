import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useImportJobsByStatus, useImportHistoricalCandles } from "../use-import-jobs";

describe("use-import-jobs hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useImportJobsByStatus fetches from the synchronizations reporting endpoint with a status filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "j1", status: "RUNNING" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useImportJobsByStatus("RUNNING"), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/market-data/synchronizations/import-jobs?status=RUNNING");
  });

  it("useImportHistoricalCandles POSTs to the synchronization import endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "j2", status: "COMPLETED" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useImportHistoricalCandles(), {
      wrapper: withQueryClient(),
    });

    await result.current.mutateAsync({
      instrumentId: "i1",
      providerConfigId: "p1",
      interval: "ONE_DAY",
      from: "2024-01-01T00:00:00.000Z",
      to: "2024-02-01T00:00:00.000Z",
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toContain("/market-data/synchronizations/import");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      instrumentId: "i1",
      providerConfigId: "p1",
      interval: "ONE_DAY",
      from: "2024-01-01T00:00:00.000Z",
      to: "2024-02-01T00:00:00.000Z",
    });
  });
});
