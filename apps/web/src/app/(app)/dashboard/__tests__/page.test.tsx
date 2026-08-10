import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import DashboardPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useSessionStore } from "@/lib/session-store";

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

  useSessionStore.setState({
    organizationId: "org-1",
    accessToken: "token",
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

  it("shows the real Notifications unread state rather than fake data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/health/ready")) {
        return jsonResponse({ status: "ok", checks: {} });
      }

      if (url.includes("/health")) {
        return jsonResponse({ status: "ok" });
      }

      if (url.includes("/portfolio")) {
        return jsonResponse({
          cashBalance: 0,
          equity: 0,
          buyingPower: 0,
          marginUsed: 0,
          marginAvailable: 0,
          openPositionCount: 0,
          closedPositionCount: 0,
        });
      }

      if (url.includes("/notifications/organizations/")) {
        return jsonResponse({ items: [], total: 0 });
      }

      return jsonResponse(paginated([]));
    }),
  );

  renderDashboard();

  await waitFor(() => {
  expect(screen.getByText("0 unread")).toBeInTheDocument();
    });
  });
});
