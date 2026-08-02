import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useInstruments, useExchanges } from "../use-instruments";

describe("use-instruments hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /**
   * Regression guard: `InstrumentController.list()` binds TWO @Query()
   * parameters to two different DTO classes (InstrumentSearchDto,
   * PaginationQueryDto). Under the API's global
   * `forbidNonWhitelisted: true`, ANY query string — even just
   * `pageSize` or `page` alone — 400s, because each DTO is validated
   * against the full raw query object and rejects the other DTO's
   * fields. Confirmed empirically against the real NestJS ValidationPipe
   * + real DTOs. The only request shape this endpoint accepts is an
   * empty query string, so this hook must never append one.
   */
  it("useInstruments calls the bare endpoint with no query string at all", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: [], pagination: { totalCount: 0, page: 1, pageSize: 50, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useInstruments(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toMatch(/\/market-data\/instruments$/);
    expect(url).not.toContain("?");
  });

  it("useExchanges calls the bare endpoint with no query string", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useExchanges(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toMatch(/\/market-data\/exchanges$/);
    expect(url).not.toContain("?");
  });
});
