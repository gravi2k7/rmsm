import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/query-wrapper";
import { useAuthStore } from "@/lib/auth-store";
import GapDetectionPage from "../page";

describe("GapDetectionPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders detected gaps and the per-status count chart, with no Ignore action offered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/market-data/gaps") && url.includes("status=DETECTED")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                {
                  id: "g1",
                  instrumentId: "11111111-1111-1111-1111-111111111111",
                  interval: "ONE_DAY",
                  gapStart: "2024-01-01T00:00:00.000Z",
                  gapEnd: "2024-01-02T00:00:00.000Z",
                  status: "DETECTED",
                  detectedAt: "2024-01-03T00:00:00.000Z",
                  repairAttempts: 0,
                },
              ]),
              { status: 200 },
            ),
          );
        }
        if (url.includes("/market-data/gaps")) {
          return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
        }
        if (url.includes("/market-data/instruments")) {
          return Promise.resolve(new Response(JSON.stringify({ data: [], pagination: { totalCount: 0, page: 1, pageSize: 50 } }), { status: 200 }));
        }
        return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
      }),
    );

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <GapDetectionPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("ONE DAY")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /repair/i })).toBeInTheDocument();
    expect(screen.getByText(/no "ignore gap" endpoint/i)).toBeInTheDocument();
  });
});
