import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { usePlans, useCreatePlan, useUpdatePlan } from "../use-plans";

describe("use-plans hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("usePlans fetches from /billing/admin/plans", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: "p1", key: "pro", name: "Professional" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePlans(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([{ id: "p1", key: "pro", name: "Professional" }]);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/billing/admin/plans");
  });

  it("useCreatePlan POSTs to /billing/admin/plans", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "p2", key: "starter" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useCreatePlan(), { wrapper: withQueryClient() });
    await result.current.mutateAsync({ key: "starter", name: "Starter", monthlyPriceCents: 999, yearlyPriceCents: 9999 });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/billing/admin/plans");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toMatchObject({ key: "starter" });
  });

  it("useUpdatePlan POSTs (not PATCH) to /billing/admin/plans/:planId, matching the API's own non-RESTful route", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "p1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useUpdatePlan("p1"), { wrapper: withQueryClient() });
    await result.current.mutateAsync({ name: "Renamed" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/billing/admin/plans/p1");
    expect(init.method).toBe("POST");
  });
});
