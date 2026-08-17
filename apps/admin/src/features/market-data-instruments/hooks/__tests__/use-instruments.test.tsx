import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useInstruments, useExchanges } from "../use-instruments";

describe("use-instruments hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "token",
      refreshToken: "refresh",
      user: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useInstruments sends server-side search and pagination parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          pagination: {
            totalCount: 0,
            page: 1,
            pageSize: 50,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () =>
        useInstruments({
          query: "XAU",
          page: 1,
          pageSize: 50,
        }),
      { wrapper: withQueryClient() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url, "http://localhost");

    expect(parsed.pathname).toMatch(/\/market-data\/instruments$/);
    expect(parsed.searchParams.get("query")).toBe("XAU");
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("pageSize")).toBe("50");
  });

  it("useInstruments sends optional filters when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [],
          pagination: {
            totalCount: 0,
            page: 1,
            pageSize: 25,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
        }),
        { status: 200 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(
      () =>
        useInstruments({
          query: "XAU",
          assetClass: "COMMODITY",
          status: "ACTIVE",
          page: 1,
          pageSize: 25,
        }),
      { wrapper: withQueryClient() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    const parsed = new URL(url, "http://localhost");

    expect(parsed.searchParams.get("query")).toBe("XAU");
    expect(parsed.searchParams.get("assetClass")).toBe("COMMODITY");
    expect(parsed.searchParams.get("status")).toBe("ACTIVE");
    expect(parsed.searchParams.get("page")).toBe("1");
    expect(parsed.searchParams.get("pageSize")).toBe("25");
  });

  it("useExchanges calls the bare endpoint with no query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useExchanges(), {
      wrapper: withQueryClient(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];

    expect(url).toMatch(/\/market-data\/exchanges$/);
    expect(url).not.toContain("?");
  });
});
