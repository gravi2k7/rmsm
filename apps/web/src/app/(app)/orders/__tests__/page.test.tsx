import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrderManagementPage from "../page";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrderManagementPage />
    </QueryClientProvider>,
  );
}

const OPEN_ORDER = {
  id: "order-1",
  decisionId: "dec-1",
  symbolCode: "EURUSD",
  side: "BUY",
  type: "MARKET",
  status: "ACCEPTED",
  quantityUnits: 10000,
  filledQuantityUnits: 0,
  createdAt: "2026-07-20T00:00:00.000Z",
};

const FILLED_ORDER = { ...OPEN_ORDER, id: "order-2", status: "FILLED", filledQuantityUnits: 10000 };

describe("OrderManagementPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows open orders by default", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [OPEN_ORDER, FILLED_ORDER], total: 2, page: 1, pageSize: 500 })));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("EURUSD")).toBeInTheDocument();
    });
    // Only one row shown (the open one) since the Executed order is filtered out on the default "Open" tab.
    expect(screen.getAllByText("EURUSD")).toHaveLength(1);
  });

  it("switching to the Executed tab shows filled orders", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [OPEN_ORDER, FILLED_ORDER], total: 2, page: 1, pageSize: 500 })));
    const user = userEvent.setup();

    renderPage();
    await waitFor(() => expect(screen.getByText("EURUSD")).toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: /executed/i }));

    await waitFor(() => {
      expect(screen.getByText("FILLED")).toBeInTheDocument();
    });
  });

  it("shows an empty state for a category with no orders", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, pageSize: 500 })));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no orders in this category/i)).toBeInTheDocument();
    });
  });
});
