import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DecisionReviewDialog } from "../decision-review-dialog";
import { useAuthStore } from "@/lib/auth-store";
import type { Decision } from "../../types";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog(decision: Decision, onOpenChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return {
    onOpenChange,
    ...render(
      <QueryClientProvider client={queryClient}>
        <DecisionReviewDialog decision={decision} open onOpenChange={onOpenChange} />
      </QueryClientProvider>,
    ),
  };
}

function decision(overrides: Partial<Decision>): Decision {
  return {
    id: "d1",
    opportunityId: "o1",
    status: "PENDING",
    riskScore: 42,
    riskPassed: true,
    failedRiskChecks: [],
    positionSizeUnits: 10000,
    positionSizeBasis: "UNITS",
    createdAt: "2026-07-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("DecisionReviewDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders risk score and assessment", () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    renderDialog(decision({ riskScore: 77.5, riskPassed: true }));
    expect(screen.getByText("77.5 / 100")).toBeInTheDocument();
    expect(screen.getByText("Passed")).toBeInTheDocument();
  });

  it("disables Approve when risk did not pass", () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    renderDialog(decision({ riskPassed: false, failedRiskChecks: ["max_exposure"] }));
    expect(screen.getByRole("button", { name: /approve/i })).toBeDisabled();
    expect(screen.getByText("max_exposure")).toBeInTheDocument();
  });

  it("calls the approve endpoint and closes the dialog on success", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(decision({ status: "APPROVED" })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    const { onOpenChange } = renderDialog(decision({}));
    await user.click(screen.getByRole("button", { name: /approve/i }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/decisions/d1/approve");
    expect(init.method).toBe("PUT");
  });

  it("calls the reject endpoint with entered comments", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(decision({ status: "REJECTED" })));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderDialog(decision({}));
    await user.type(screen.getByLabelText(/comments/i), "Too risky");
    await user.click(screen.getByRole("button", { name: /reject/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/decisions/d1/reject");
    expect(JSON.parse(init.body as string)).toEqual({ comments: "Too risky" });
  });

  it("does not show approve/reject actions for an already-decided decision", () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    renderDialog(decision({ status: "APPROVED", decidedBy: "user-1" }));
    expect(screen.queryByRole("button", { name: /^approve$/i })).not.toBeInTheDocument();
    expect(screen.getByText("user-1")).toBeInTheDocument();
  });
});
