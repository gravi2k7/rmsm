import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createTestQueryClient } from "@/test/query-wrapper";
import { useAuthStore } from "@/lib/auth-store";
import ProvidersPage from "../page";

describe("ProvidersPage", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "token", refreshToken: "refresh", user: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders providers joined with their live diagnostics status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("/market-data/providers/diagnostics")) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { providerConfigId: "p1", providerType: "TWELVE_DATA", name: "Twelve Data", isActive: true, priority: 1, registered: true, enabled: true, circuitState: "closed", credential: { providerType: "TWELVE_DATA", requirement: "REQUIRED", configured: true } },
              ]),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify([{ id: "p1", type: "TWELVE_DATA", name: "Twelve Data", supportedAssetClasses: ["EQUITY"], isActive: true, priority: 1 }]), { status: 200 }),
        );
      }),
    );

    const client = createTestQueryClient();
    render(
      <QueryClientProvider client={client}>
        <ProvidersPage />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(screen.getByText("Twelve Data")).toBeInTheDocument());
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    expect(screen.getByText(/no create\/enable\/disable endpoint/i)).toBeInTheDocument();
  });
});
