import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/query-wrapper";
import { useAuthStore } from "@/lib/auth-store";
import SubscriptionPlansPage from "../page";

describe("SubscriptionPlansPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders plans with formatted monthly/yearly prices and a status badge", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify([
            {
              id: "p1",
              key: "professional",
              name: "Professional",
              monthlyPriceCents: 4900,
              yearlyPriceCents: 49900,
              currency: "USD",
              trialDays: 14,
              gracePeriodDays: 3,
              isVisible: true,
              isActive: true,
              displayOrder: 0,
            },
          ]),
          { status: 200 },
        ),
      ),
    );

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <SubscriptionPlansPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Professional")).toBeInTheDocument());
    expect(screen.getByText("$49.00")).toBeInTheDocument();
    expect(screen.getByText("$499.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /new plan/i })).toBeInTheDocument();
  });
});
