import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import DashboardPage from "../page";
import { useAuthStore } from "@/lib/auth-store";

function paginated<T>(items: T[]) {
  return { items, total: items.length, page: 1, pageSize: 500 };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDashboard() {
  return renderWithQueryClient(<DashboardPage />);
}

describe("DashboardPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: "token",
      refreshToken: "refresh",
      user: {
        sub: "u1",
        email: "trader@example.com",
        roles: ["TRADER"],
        permissions: [],
        sessionId: "s1",
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders portfolio figures from real endpoint data once loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/portfolio")) {
          return jsonResponse({
            id: "pf1",
            cashBalance: 5000,
            equity: 12345,
            buyingPower: 20000,
            marginUsed: 1000,
            marginAvailable: 4000,
            openPositionCount: 1,
            closedPositionCount: 3,
            createdAt: "2026-01-01T00:00:00.000Z",
          });
        }
        if (url.includes("/positions")) return jsonResponse(paginated([]));
        if (url.includes("/trades")) return jsonResponse(paginated([]));
        if (url.includes("/orders")) return jsonResponse(paginated([]));
        if (url.includes("/opportunities")) return jsonResponse(paginated([]));
        if (url.includes("/decisions")) return jsonResponse(paginated([]));
        if (url.includes("/strategies")) return jsonResponse(paginated([]));
        if (url.includes("/markets")) return jsonResponse(paginated([]));
        if (url.includes("/health/ready"))
          return jsonResponse({ status: "ok", checks: {} });
        if (url.includes("/health")) return jsonResponse({ status: "ok" });
        return jsonResponse({});
      }),
    );

    renderDashboard();

    expect(
      screen.getByText(/welcome, trader@example.com/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("$12,345.00")).toBeInTheDocument();
    });
  });

  it("shows an 'Unavailable' state for a widget whose endpoint fails, without blocking the rest of the page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/portfolio")) return jsonResponse({}, 500);
        if (url.includes("/health/ready"))
          return jsonResponse({ status: "ok", checks: {} });
        if (url.includes("/health")) return jsonResponse({ status: "ok" });
        return jsonResponse(paginated([]));
      }),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getAllByText(/unavailable/i).length).toBeGreaterThan(0);
    });
    // The rest of the dashboard still rendered its shell despite one
    // widget's data failing.
    expect(screen.getByText(/your trading workspace/i)).toBeInTheDocument();
  });

  it("shows an honest 'no session' state for Notifications rather than fake data", async () => {
    // UD-001.1 Phase 3: SystemStatusWidget replaced the old static "coming
    // soon" placeholder with a real unread count from useNotifications() --
    // gated by useRequestContext() the same way NotificationCenter and the
    // /notifications page already are. This test never connects a session
    // (no useSessionStore.organizationId), so the honest state to assert is
    // now "No session" rather than a fabricated count -- same spirit as the
    // original test (no fake data), updated for the now-real widget.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/health/ready"))
          return jsonResponse({ status: "ok", checks: {} });
        if (url.includes("/health")) return jsonResponse({ status: "ok" });
        if (url.includes("/portfolio"))
          return jsonResponse({
            cashBalance: 0,
            equity: 0,
            buyingPower: 0,
            marginUsed: 0,
            marginAvailable: 0,
            openPositionCount: 0,
            closedPositionCount: 0,
          });
        return jsonResponse(paginated([]));
      }),
    );

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no session/i)).toBeInTheDocument();
    });
  });
});
