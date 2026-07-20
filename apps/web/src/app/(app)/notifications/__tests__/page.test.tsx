import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import NotificationCenterPage from "../page";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationCenterPage />
    </QueryClientProvider>,
  );
}

describe("NotificationCenterPage", () => {
  beforeEach(() => {
    useSessionStore.setState({ organizationId: null, accessToken: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the session-connect gate when no org session exists", () => {
    renderPage();
    expect(screen.getByText(/no session connected/i)).toBeInTheDocument();
  });

  it("renders unread notifications once a session is connected", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "token-1" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          items: [
            {
              id: "n1",
              organizationId: "org-1",
              type: "DIRECT",
              channel: "IN_APP",
              priority: "HIGH",
              status: "DELIVERED",
              categoryId: null,
              subject: "Order filled",
              body: "Your EURUSD order was filled.",
              data: {},
              readAt: null,
              archivedAt: null,
              createdAt: "2026-07-20T00:00:00.000Z",
            },
          ],
          total: 1,
        }),
      ),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Order filled")).toBeInTheDocument();
    });
    expect(screen.getByText("1 unread")).toBeInTheDocument();
  });
});
