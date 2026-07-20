import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "../use-notifications";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe("notification hooks", () => {
  beforeEach(() => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "token-1" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("useNotifications fetches from the notifications/organizations/:id URL shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0 }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain("/notifications/organizations/org-1");
  });

  it("useNotifications does not fire when no org session is connected", () => {
    useSessionStore.setState({ organizationId: null, accessToken: null });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderHook(() => useNotifications(), { wrapper });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("useMarkNotificationRead calls the read endpoint with PATCH", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "n1", readAt: "2026-07-20T00:00:00.000Z" }));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useMarkNotificationRead(), { wrapper });
    await result.current.mutateAsync("n1");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/notifications/organizations/org-1/n1/read");
    expect(init.method).toBe("PATCH");
  });

  it("useMarkAllRead issues one real request per notification (no fake bulk endpoint)", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useMarkAllRead(), { wrapper });
    await result.current.mutateAsync(["n1", "n2", "n3"]);

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
