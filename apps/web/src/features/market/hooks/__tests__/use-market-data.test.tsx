import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@/test/render-with-query";
import { useInstruments, useQuotes, useExchanges } from "../use-market-data";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("market-data hooks", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useInstruments builds a query string with query/assetClass/status/page/pageSize", async () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ data: [], pagination: { page: 2, pageSize: 10, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: true } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useInstruments({ query: "EUR", assetClass: "FOREX", page: 2, pageSize: 10 }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/market-data/instruments?");
    expect(url).toContain("query=EUR");
    expect(url).toContain("assetClass=FOREX");
    expect(url).toContain("page=2");
    expect(url).toContain("pageSize=10");
  });

  it("useQuotes sends instrumentIds as repeated query params, sorted for cache stability", async () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useQuotes(["b-id", "a-id"]), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url, "http://localhost");
    expect(parsed.searchParams.getAll("instrumentIds")).toEqual(["a-id", "b-id"]);
  });

  it("useQuotes does not fire a request when given an empty id list", () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    renderHook(() => useQuotes([]), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useExchanges calls the market-data exchanges endpoint", async () => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useExchanges(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/market-data/exchanges");
  });
});
