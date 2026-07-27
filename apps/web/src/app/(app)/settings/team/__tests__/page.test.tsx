import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import TeamPage from "../page";
import { useAuthStore } from "@/lib/auth-store";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TeamPage />
    </QueryClientProvider>,
  );
}

describe("TeamPage (WM-020E)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
    useSessionStore.getState().clear();
  });

  it("shows the Invite Member button for a user with the invite permission", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: { sub: "u1", email: "owner@example.com", roles: ["OWNER"], permissions: ["organization.member.invite"], sessionId: "s1" } });
    useSessionStore.setState({ organizationId: "org-1", accessToken: "session-t" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    renderPage();

    expect(await screen.findByRole("button", { name: /invite member/i })).toBeInTheDocument();
  });

  it("hides the Invite Member button for a user without the invite permission", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: { sub: "u2", email: "viewer@example.com", roles: ["VIEWER"], permissions: [], sessionId: "s2" } });
    useSessionStore.setState({ organizationId: "org-1", accessToken: "session-t" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse([])));

    renderPage();

    await screen.findByRole("heading", { name: /pending invitations/i });
    expect(screen.queryByRole("button", { name: /invite member/i })).not.toBeInTheDocument();
  });

  it("prompts for an active session when there's no organization context", () => {
    renderPage();
    expect(screen.getByText(/no active organization session/i)).toBeInTheDocument();
  });
});
