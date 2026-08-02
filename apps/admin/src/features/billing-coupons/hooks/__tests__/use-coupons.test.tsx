import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useCoupons, useCreateCoupon, useDeactivateCoupon } from "../use-coupons";

describe("use-coupons hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useCoupons fetches from /billing/admin/coupons", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));
    const { result } = renderHook(() => useCoupons(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it("useCreateCoupon submits the DTO's own accepted type values", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "c1", code: "SAVE10" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCreateCoupon(), { wrapper: withQueryClient() });
    await result.current.mutateAsync({ code: "SAVE10", type: "PERCENTAGE", value: 10 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/billing/admin/coupons");
    expect(JSON.parse(init.body as string)).toMatchObject({ code: "SAVE10", type: "PERCENTAGE", value: 10 });
  });

  it("useDeactivateCoupon POSTs to the deactivate route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "c1", isActive: false }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useDeactivateCoupon(), { wrapper: withQueryClient() });
    await result.current.mutateAsync("c1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/billing/admin/coupons/c1/deactivate");
    expect(init.method).toBe("POST");
  });
});
