import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import userEvent from "@testing-library/user-event";
import WatchlistsPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useWatchlistStore } from "@/features/watchlists/store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderWatchlists() {
  return renderWithQueryClient(<WatchlistsPage />);
}

describe("WatchlistsPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
    useWatchlistStore.setState({
      watchlists: [{ id: "default", name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: "default",
      favoriteInstrumentIds: [],
      pinnedInstrumentIds: [],
      recentInstrumentIds: [],
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ data: [], pagination: { page: 1, pageSize: 500, totalCount: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } }),
      ),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the default watchlist and an empty-symbols message", async () => {
    renderWatchlists();
    await waitFor(() => {
      expect(screen.getByText(/no symbols yet/i)).toBeInTheDocument();
    });
  });

  it("creating a new watchlist adds a tab and makes it active", async () => {
    const user = userEvent.setup();
    renderWatchlists();
    await waitFor(() => expect(screen.getByText(/no symbols yet/i)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /new watchlist/i }));
    await user.type(screen.getByLabelText("Name", { exact: true }), "Majors");
    await user.click(screen.getByRole("button", { name: /^create$/i }));

    expect(useWatchlistStore.getState().watchlists.map((w) => w.name)).toContain("Majors");
  });
});
