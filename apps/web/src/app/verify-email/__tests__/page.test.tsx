import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/render-with-query";
import VerifyEmailPage from "../page";
import { useSessionStore } from "@/lib/session-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const searchParamsMock = vi.fn();
const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
  useRouter: () => ({ push: routerPushMock }),
}));

describe("VerifyEmailPage (WM-020C/D)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    routerPushMock.mockClear();
    useSessionStore.setState({ organizationId: null, accessToken: null });
  });

  it("shows a missing-token state and the resend form when no token is present, without calling the API", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<VerifyEmailPage />);

    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /resend verification email/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("auto-verifies on mount, completes onboarding, shows the progress checklist, and offers a dashboard link", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=raw-token"));
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<VerifyEmailPage />);

    expect(await screen.findByRole("status")).toHaveTextContent(/verifying your email/i);

    resolveFetch(
      jsonResponse({
        message: "Email verified and workspace created.",
        organizationId: "org-1",
        organizationName: "Jane's Organization",
        role: "OWNER",
        source: "created",
      }),
    );

    expect(await screen.findByText(/jane's organization is ready/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to dashboard/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("list", { name: /onboarding progress/i })).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/onboarding/verify-email");
    expect(JSON.parse(init.body as string)).toEqual({ token: "raw-token" });

    // Bridges the newly-created organization into the legacy session store (see useLogin()'s own comment on this bridge).
    expect(useSessionStore.getState().organizationId).toBe("org-1");
  });

  it("carries invitationToken/companyName from the URL into the request and shows invitation-specific success copy", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=raw-token&invitationToken=raw-invite&companyName=Acme"));
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        message: "Email verified and invitation accepted.",
        organizationId: "org-invited",
        organizationName: "Acme Capital",
        role: "ANALYST",
        source: "invitation_accepted",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<VerifyEmailPage />);

    expect(await screen.findByText(/you've joined acme capital/i)).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ token: "raw-token", invitationToken: "raw-invite", companyName: "Acme" });
  });

  it("shows the backend's invalid/expired-token message and the resend form on failure", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=stale-token"));
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Invalid or expired verification token." } }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);

    renderWithQueryClient(<VerifyEmailPage />);

    expect(await screen.findByText(/invalid or expired verification token/i)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /resend verification email/i })).toBeInTheDocument();
  });

  it("resend form posts to /auth/resend-verification and shows a generic confirmation", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithQueryClient(<VerifyEmailPage />);

    await user.type(screen.getByLabelText("Email"), "jane@acme.example");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText(/a new link is on its way/i)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/resend-verification");
    expect(JSON.parse(init.body as string)).toEqual({ email: "jane@acme.example" });
  });

  it("validates the resend email field", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderWithQueryClient(<VerifyEmailPage />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
