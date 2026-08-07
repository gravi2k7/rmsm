import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "../command-palette";
import { useAuthStore } from "@/lib/auth-store";
import { useCommandPaletteStore } from "@/lib/command-palette-store";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPalette() {
  return renderWithQueryClient(<CommandPalette />);
}

describe("CommandPalette", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    pushMock.mockClear();
    // `open` moved from local `useState` to a module-singleton
    // `useCommandPaletteStore` (Phase 2 — lets Topnav's Search button open
    // the same palette). The store no longer resets itself on unmount the
    // way local state did, so each test that opens the palette must close
    // it again or the next test's Cmd+K toggle would close instead of open.
    useCommandPaletteStore.setState({ open: false });
  });

  it("is closed by default", () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    renderPalette();
    expect(screen.queryByPlaceholderText(/search pages, symbols/i)).not.toBeInTheDocument();
  });

  it("opens on Cmd+K", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [], pagination: {} })));
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard("{Meta>}k{/Meta}");

    expect(await screen.findByPlaceholderText(/search pages, symbols/i)).toBeInTheDocument();
  });

  it("navigates to a real route when a page command is selected", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [], pagination: {} })));
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard("{Meta>}k{/Meta}");

    await user.click(await screen.findByText("Portfolio"));

    expect(pushMock).toHaveBeenCalledWith("/portfolio");
  });

  it("live-searches instruments for queries of 2+ characters", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () =>
        jsonResponse({
          data: [{ id: "instr-1", symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "FOREX", status: "ACTIVE", currency: "USD", exchangeId: "ex-1", createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" }],
          pagination: { page: 1, pageSize: 5, totalCount: 1, totalPages: 1, hasNextPage: false, hasPreviousPage: false },
        }),
      ),
    );
    const user = userEvent.setup();
    renderPalette();
    await user.keyboard("{Meta>}k{/Meta}");

    await user.type(await screen.findByPlaceholderText(/search pages, symbols/i), "EUR");

    await waitFor(() => {
      expect(screen.getByText("EURUSD")).toBeInTheDocument();
    });
  });

  it("does not fetch instruments before the trader has typed 2+ characters", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({ data: [], pagination: {} }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard("{Meta>}k{/Meta}");
    await user.type(await screen.findByPlaceholderText(/search pages, symbols/i), "E");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
