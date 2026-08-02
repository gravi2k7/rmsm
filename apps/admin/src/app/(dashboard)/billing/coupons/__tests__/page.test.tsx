import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/query-wrapper";
import { useAuthStore } from "@/lib/auth-store";
import CouponsPage from "../page";

describe("CouponsPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders coupon rows from /billing/admin/coupons and explains the no-delete-endpoint constraint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            { id: "c1", code: "SAVE20", type: "PERCENTAGE", value: 20, currentRedemptions: 3, maxRedemptions: 100, isActive: true, isPublic: true },
          ]),
          { status: 200 },
        ),
      ),
    );

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <CouponsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("SAVE20")).toBeInTheDocument());
    expect(screen.getByText(/no edit\/delete endpoint exists/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /deactivate/i })).toBeInTheDocument();
  });

  it("shows the empty state when there are no coupons", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { status: 200 })));

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <CouponsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("No coupons yet")).toBeInTheDocument());
  });
});
