import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { CreateOrderDialog } from "../create-order-dialog";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog(props: Partial<ComponentProps<typeof CreateOrderDialog>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateOrderDialog {...props} />
    </QueryClientProvider>,
  );
}

describe("CreateOrderDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("pre-fills decisionId and symbolCode when provided", () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const validUuid = "11111111-1111-1111-1111-111111111111";
    renderDialog({ open: true, onOpenChange: vi.fn(), defaultDecisionId: validUuid, defaultSymbolCode: "EURUSD" });

    expect(screen.getByLabelText(/decision id/i)).toHaveValue(validUuid);
    expect(screen.getByLabelText(/symbol/i)).toHaveValue("EURUSD");
  });

  it("requires a limit price for LIMIT orders", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const user = userEvent.setup();
    renderDialog({ open: true, onOpenChange: vi.fn() });

    await user.click(screen.getByRole("combobox", { name: /order type/i }));
    await user.click(await screen.findByRole("option", { name: /^limit$/i }));

    expect(await screen.findByLabelText(/limit price/i)).toBeInTheDocument();
  });

  it("submits a valid MARKET order and closes on success", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ id: "order-1", decisionId: "11111111-1111-1111-1111-111111111111", symbolCode: "EURUSD", side: "BUY", type: "MARKET", status: "PENDING", quantityUnits: 10000, filledQuantityUnits: 0, createdAt: "2026-07-20T00:00:00.000Z" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderDialog({ open: true, onOpenChange, defaultDecisionId: "11111111-1111-1111-1111-111111111111", defaultSymbolCode: "EURUSD" });

    await user.type(screen.getByLabelText(/quantity/i), "10000");
    await user.click(screen.getByRole("button", { name: /place order/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/orders");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ decisionId: "11111111-1111-1111-1111-111111111111", symbolCode: "EURUSD", side: "BUY", type: "MARKET", quantityUnits: 10000 });
  });
});
