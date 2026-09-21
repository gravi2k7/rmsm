import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@/test/render-with-query";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "../use-notifications";
import { useAuthStore } from "@/lib/auth-store";
import { useOrganizationStore } from "@/lib/organization-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("notification hooks", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "token-1",
      refreshToken: "refresh-1",
      user: null,
    });
    useOrganizationStore.setState({
      activeOrganization: { id: "org-1" } as never,
    });
    useOrganizationStore.setState({ activeOrganization: { id: "org-1" } as never });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useNotifications fetches from the notifications/organizations/:id URL shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/notifications/organizations/org-1");
  });

  it("useNotifications does not fire when no org session is connected", () => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
    useOrganizationStore.setState({
      activeOrganization: null,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    renderHook(() => useNotifications(), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useMarkNotificationRead calls the read endpoint with PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "n1", readAt: "2026-07-20T00:00:00.000Z" }));
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    await result.current.mutateAsync("n1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/notifications/organizations/org-1/n1/read");
    expect(init.method).toBe("PATCH");
  });

  it("useMarkAllRead calls the real bulk read-all endpoint once", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ count: 3 }));
    vi.stubGlobal("fetch", fetchMock);

    const { wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useMarkAllRead(), { wrapper });
    await result.current.mutateAsync();

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/notifications/organizations/org-1/read-all");
    expect(init.method).toBe("PATCH");
  });
});
