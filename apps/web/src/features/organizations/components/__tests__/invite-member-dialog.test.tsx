import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import userEvent from "@testing-library/user-event";
import { InviteMemberDialog } from "../invite-member-dialog";
import { useAuthStore } from "@/lib/auth-store";
import { useOrganizationStore } from "@/lib/organization-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderDialog() {
  return renderWithQueryClient(<InviteMemberDialog />);
}

describe("InviteMemberDialog (WM-020E)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    useAuthStore.setState({
      accessToken: null,
      refreshToken: null,
      user: null,
      rememberMe: false,
      sessionExpired: false,
    });
    useOrganizationStore.getState().setActiveOrganization(null);
  });

  it("submits email, role, message, and expiresInDays to the org-scoped invite endpoint", async () => {
    useAuthStore.setState({ accessToken: "session-token" });
    useOrganizationStore.setState({ activeOrganization: { id: "org-1" } as never });
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
    useAuthStore.setState({ accessToken: "session-token" });
    useOrganizationStore.setState({ activeOrganization: { id: "org-1" } as never });
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
    useAuthStore.setState({ accessToken: "session-token" });
    useOrganizationStore.setState({ activeOrganization: { id: "org-1" } as never });
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
