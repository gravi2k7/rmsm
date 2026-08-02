import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/query-wrapper";
import { useAuthStore } from "@/lib/auth-store";
import ImportJobsPage from "../page";

describe("ImportJobsPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("defaults to the RUNNING tab and renders jobs for that status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("status=RUNNING")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { id: "11111111-aaaa-bbbb-cccc-111111111111", providerId: "p1", jobType: "HISTORICAL_IMPORT", status: "RUNNING", startedAt: "2024-01-01T00:00:00.000Z", completedAt: null, recordsProcessed: 120, recordsFailed: 0 },
              ]),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response(JSON.stringify([]), { status: 200 }));
      }),
    );

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <ImportJobsPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("HISTORICAL_IMPORT")).toBeInTheDocument());
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getAllByText("RUNNING").length).toBeGreaterThan(0);
  });
});
