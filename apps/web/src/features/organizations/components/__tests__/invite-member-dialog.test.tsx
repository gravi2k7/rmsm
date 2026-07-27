import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { InviteMemberDialog } from "../invite-member-dialog";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <InviteMemberDialog />
    </QueryClientProvider>,
  );
}

describe("InviteMemberDialog (WM-020E)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useSessionStore.getState().clear();
  });

  it("submits email, role, message, and expiresInDays to the org-scoped invite endpoint", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "session-token" });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Invitation sent." }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderDialog();
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/^email$/i), "newmember@example.com");

    await user.click(screen.getByRole("combobox", { name: /role/i }));
    await user.click(await screen.findByRole("option", { name: /^manager$/i }));

    await user.type(screen.getByLabelText(/message/i), "Welcome to the desk!");

    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/organizations/org-1/members/invite");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({ email: "newmember@example.com", role: "MANAGER", message: "Welcome to the desk!", expiresInDays: 7 });
  });

  it("shows a validation error for an invalid email and never calls fetch", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "session-token" });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderDialog();
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/^email$/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a server error banner (e.g. duplicate invitation) without closing the dialog", async () => {
    useSessionStore.setState({ organizationId: "org-1", accessToken: "session-token" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: "invitee@example.com already has a pending invitation to this organization." } }, 409),
      ),
    );
    const user = userEvent.setup();

    renderDialog();
    await user.click(screen.getByRole("button", { name: /invite member/i }));
    await user.type(screen.getByLabelText(/^email$/i), "invitee@example.com");
    await user.click(screen.getByRole("button", { name: /send invitation/i }));

    expect(await screen.findByText(/already has a pending invitation/i)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
