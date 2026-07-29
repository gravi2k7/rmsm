import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import DecisionCenterPage from "../page";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  return renderWithQueryClient(<DecisionCenterPage />);
}

const SAMPLE_DECISION = {
  id: "dec-1",
  opportunityId: "opp-1",
  status: "PENDING",
  riskScore: 55,
  riskPassed: true,
  failedRiskChecks: [],
  positionSizeUnits: 5000,
  positionSizeBasis: "UNITS",
  createdAt: "2026-07-20T00:00:00.000Z",
};

describe("DecisionCenterPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders decisions and offers Review for pending ones", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [SAMPLE_DECISION], total: 1, page: 1, pageSize: 500 })));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("55.0")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /review/i })).toBeInTheDocument();
  });

  it("does not offer Review for an already-approved decision", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ items: [{ ...SAMPLE_DECISION, status: "APPROVED" }], total: 1, page: 1, pageSize: 500 })),
    );

    renderPage();

    await waitFor(() => {
      expect(screen.getByText("55.0")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /review/i })).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no decisions", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ items: [], total: 0, page: 1, pageSize: 500 })));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/no decisions match/i)).toBeInTheDocument();
    });
  });
});
