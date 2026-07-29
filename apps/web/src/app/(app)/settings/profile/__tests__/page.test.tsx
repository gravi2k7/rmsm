import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import ProfilePage from "../page";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  return renderWithQueryClient(<ProfilePage />);
}

describe("ProfilePage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders the account email and profile fields from real endpoint data", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/users/me")) {
          return jsonResponse({
            id: "u1",
            email: "trader@example.com",
            status: "ACTIVE",
            emailVerifiedAt: "2026-01-01T00:00:00.000Z",
            createdAt: "2026-01-01T00:00:00.000Z",
            profile: { id: "p1", userId: "u1", firstName: "Jane", lastName: "Trader", avatarUrl: null, timezone: "UTC", language: "en", phone: null, notificationPreferences: {}, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
          });
        }
        if (url.includes("/sessions/login-history")) {
          return jsonResponse({ data: [], pagination: { page: 1, pageSize: 10, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } });
        }
        return jsonResponse({});
      }),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("trader@example.com")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Jane")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Trader")).toBeInTheDocument();
  });
});
