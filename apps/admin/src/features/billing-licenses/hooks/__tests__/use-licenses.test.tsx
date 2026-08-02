import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@/lib/auth-store";
import { withQueryClient } from "@/test/query-wrapper";
import { useLicenses, useIssueLicense, useAssignLicense, useRevokeLicense } from "../use-licenses";

describe("use-licenses hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useLicenses fetches the platform-wide /admin/licenses route", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ items: [], total: 0 }), { status: 200 })));
    const { result } = renderHook(() => useLicenses(), { wrapper: withQueryClient() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ items: [], total: 0 });
  });

  it("useIssueLicense POSTs to /admin/licenses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "l1", type: "ENTERPRISE" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useIssueLicense(), { wrapper: withQueryClient() });
    await result.current.mutateAsync({ type: "ENTERPRISE", seats: 10 });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/admin/licenses");
  });

  it("useAssignLicense POSTs to /admin/licenses/:id/assign", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "l1", status: "ACTIVE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useAssignLicense("l1"), { wrapper: withQueryClient() });
    await result.current.mutateAsync({ organizationId: "org-1" });
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/admin/licenses/l1/assign");
  });

  it("useRevokeLicense POSTs to /admin/licenses/:id/revoke", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "l1", status: "REVOKED" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useRevokeLicense(), { wrapper: withQueryClient() });
    await result.current.mutateAsync("l1");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/admin/licenses/l1/revoke");
  });
});
