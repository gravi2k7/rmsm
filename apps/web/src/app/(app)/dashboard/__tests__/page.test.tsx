import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import DashboardPage from "../page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
  }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("DashboardPage", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("redirects to the chart workstation using EUR/USD", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/market-data/instruments")) {
          return jsonResponse({
            data: [
              {
                id: "eurusd-1",
                symbol: "EURUSD",
                name: "EUR/USD",
                assetClass: "FOREX",
                status: "ACTIVE",
              },
            ],
            pagination: {
              page: 1,
              pageSize: 100,
              totalCount: 1,
              totalPages: 1,
              hasNextPage: false,
              hasPreviousPage: false,
            },
          });
        }

        return jsonResponse({});
      }),
    );

    renderWithQueryClient(<DashboardPage />);

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/trading?instrument=eurusd-1");
    });

    expect(replace).toHaveBeenCalledTimes(1);
  });

  it("shows a loading state while the chart instrument is loading", () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            // Keep the request pending.
          }),
      ),
    );

    renderWithQueryClient(<DashboardPage />);

    expect(
      screen.getByText("Loading chart workspace…"),
    ).toBeInTheDocument();

    expect(replace).not.toHaveBeenCalled();
  });

  it("shows an error when the instrument lookup fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("/market-data/instruments")) {
          return jsonResponse(
            {
              success: false,
              error: {
                code: "INTERNAL_ERROR",
                message: "Unable to load instruments",
              },
            },
            500,
          );
        }

        return jsonResponse({});
      }),
    );

    renderWithQueryClient(<DashboardPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load the chart workspace."),
      ).toBeInTheDocument();
    });

    expect(replace).not.toHaveBeenCalled();
  });
});
