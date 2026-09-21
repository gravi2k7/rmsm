import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import NotificationCenterPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useOrganizationStore } from "@/lib/organization-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  return renderWithQueryClient(<NotificationCenterPage />);
}

describe("NotificationCenterPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
    });
    useOrganizationStore.setState({
      activeOrganization: null,
    });
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
    useAuthStore.setState({
      accessToken: "token-1",
      refreshToken: "refresh-1",
      user: null,
    });
    useOrganizationStore.setState({
      activeOrganization: { id: "org-1" } as never,
    });
    useOrganizationStore.setState({ activeOrganization: { id: "org-1" } as never });
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
