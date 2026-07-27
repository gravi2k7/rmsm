import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PendingInvitationsList } from "../pending-invitations-list";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PendingInvitationsList />
    </QueryClientProvider>,
  );
}

const invitation = {
  id: "inv-1",
  organizationId: "org-1",
  email: "invitee@example.com",
  role: "TRADER",
  status: "PENDING",
  invitedById: "user-1",
  expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
  acceptedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("PendingInvitationsList (WM-020E)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useSessionStore.getState().clear();
  });

  it("shows an empty state when there are no pending invitations", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "t" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    renderList();

    expect(await screen.findByText(/no pending invitations/i)).toBeInTheDocument();
  });

  it("lists invitations with email, role, and status", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "t" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([invitation])));

    renderList();

    expect(await screen.findByText("invitee@example.com")).toBeInTheDocument();
    expect(screen.getByText("TRADER")).toBeInTheDocument();
    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it("cancels a pending invitation via the org-scoped cancel endpoint", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "t" });
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/cancel")) return jsonResponse({ message: "Invitation cancelled." });
      return jsonResponse([invitation]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderList();
    await screen.findByText("invitee@example.com");
    await user.click(screen.getByRole("button", { name: /cancel invitation to invitee@example.com/i }));

    await waitFor(() => {
      const cancelCall = fetchMock.mock.calls.find((call: unknown[]) => (call[0] as string).includes("/cancel"));
      expect(cancelCall).toBeDefined();
    });
    const cancelCall = fetchMock.mock.calls.find((call: unknown[]) => (call[0] as string).includes("/cancel")) as [string, RequestInit];
    expect(cancelCall[0]).toContain("/organizations/org-1/invitations/inv-1/cancel");
    expect(cancelCall[1].method).toBe("POST");
  });

  it("resends an expired invitation via the org-scoped resend endpoint", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "t" });
    const expired = { ...invitation, expiresAt: new Date(Date.now() - 1000).toISOString() };
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/resend")) return jsonResponse({ message: "Invitation resent." });
      return jsonResponse([expired]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderList();
    await screen.findByText("invitee@example.com");
    expect(screen.getByText("EXPIRED")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /resend invitation to invitee@example.com/i }));

    await waitFor(() => {
      const resendCall = fetchMock.mock.calls.find((call: unknown[]) => (call[0] as string).includes("/resend"));
      expect(resendCall).toBeDefined();
    });
  });
});
