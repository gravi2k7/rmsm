import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AcceptInvitationPage from "../page";
import { useAuthStore } from "@/lib/auth-store";

const routerPushMock = vi.fn();
const searchParamsMock = vi.fn(() => new URLSearchParams("token=raw-invite-token"));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
  useRouter: () => ({ push: routerPushMock }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AcceptInvitationPage />
    </QueryClientProvider>,
  );
}

describe("AcceptInvitationPage (WM-020E)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    routerPushMock.mockClear();
    searchParamsMock.mockReturnValue(new URLSearchParams("token=raw-invite-token"));
    useAuthStore.setState({ accessToken: null, refreshToken: null, user: null });
  });

  it("previews the organization and role from the public validate endpoint", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ valid: true, organizationName: "Acme Trading Desk", role: "TRADER", email: "invitee@example.com" })));

    renderPage();

    expect(await screen.findByText(/Acme Trading Desk/)).toBeInTheDocument();
    expect(screen.getByText(/Trader/)).toBeInTheDocument();
  });

  it("shows an invalid/expired message when the token doesn't validate", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ valid: false })));

    renderPage();

    expect(await screen.findByText(/no longer valid/i)).toBeInTheDocument();
  });

  it("shows sign-up/log-in CTAs (not Accept/Decline) when the visitor isn't authenticated", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ valid: true, organizationName: "Acme", role: "TRADER" })));

    renderPage();

    expect(await screen.findByRole("link", { name: /create an account/i })).toHaveAttribute(
      "href",
      "/signup?invitationToken=raw-invite-token",
    );
    expect(screen.queryByRole("button", { name: /^accept$/i })).not.toBeInTheDocument();
  });

  it("accepts the invitation and redirects to /invitations/success when authenticated", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: { sub: "u1", email: "invitee@example.com", roles: [], permissions: [], sessionId: "s1" } });
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/validate")) return jsonResponse({ valid: true, organizationName: "Acme", role: "TRADER" });
      if (url.includes("/accept")) return jsonResponse({ id: "mem-1" });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: /^accept$/i }));

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith("/invitations/success"));
    const acceptCall = fetchMock.mock.calls.find((call: unknown[]) => (call[0] as string).includes("/accept")) as [string, RequestInit];
    expect(JSON.parse(acceptCall[1].body as string)).toEqual({ token: "raw-invite-token" });
  });

  it("declines the invitation and redirects to /invitations/declined when authenticated", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: { sub: "u1", email: "invitee@example.com", roles: [], permissions: [], sessionId: "s1" } });
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("/validate")) return jsonResponse({ valid: true, organizationName: "Acme", role: "TRADER" });
      if (url.includes("/decline")) return jsonResponse({ message: "Invitation declined." });
      return jsonResponse({});
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderPage();
    await user.click(await screen.findByRole("button", { name: /^decline$/i }));

    await waitFor(() => expect(routerPushMock).toHaveBeenCalledWith("/invitations/declined"));
  });

  it("shows a missing-token message when there is no ?token= in the URL", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    vi.stubGlobal("fetch", vi.fn());

    renderPage();

    expect(await screen.findByText(/missing its token/i)).toBeInTheDocument();
  });
});
