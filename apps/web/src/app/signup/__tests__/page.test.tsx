import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/render-with-query";
import SignupPage from "../page";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const searchParamsMock = vi.fn(() => new URLSearchParams(""));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
}));

function renderPage() {
  return renderWithQueryClient(<SignupPage />);
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/first name/i), "Jane");
  await user.type(screen.getByLabelText(/last name/i), "Trader");
  await user.type(screen.getByLabelText(/business email/i), "jane@acme-capital.example");
  await user.type(screen.getByLabelText(/company name/i), "Acme Capital");
  await user.type(screen.getByLabelText(/^password$/i), "correcthorsebattery1");
  await user.type(screen.getByLabelText(/confirm password/i), "correcthorsebattery1");
  await user.click(screen.getByLabelText(/terms of service/i));
}

describe("SignupPage (WM-020A/B/D/E)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
  });

  it("renders the hero, every required field with an accessible label, and the primary CTA", () => {
    renderPage();

    expect(screen.getByRole("heading", { level: 3, name: /create your rmsm workspace/i })).toBeInTheDocument();
    expect(screen.getByText(/start your free enterprise trial/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/terms of service/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/product news and platform updates/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /create workspace/i })).toBeInTheDocument();
  });

  it("links 'Already have an account? Login' to /login", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Login" })).toHaveAttribute("href", "/login");
  });

  it("shows accessible required-field errors when submitting an empty form (no network call)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    const firstNameError = await screen.findByText(/first name is required/i);
    expect(firstNameError).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/first name/i)).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(/last name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/business email is required/i)).toBeInTheDocument();
    expect(screen.getByText(/company name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password must be at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/must accept the terms of service/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("validates business email format", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/business email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/enter a valid business email address/i)).toBeInTheDocument();
  });

  it("requires the password confirmation to match", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/^password$/i), "correcthorsebattery1");
    await user.type(screen.getByLabelText(/confirm password/i), "somethingelse123456");
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it("shows a live password strength indicator that updates as the user types", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.queryByText(/password strength/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password$/i), "abc");
    expect(await screen.findByText(/password strength/i)).toBeInTheDocument();
    expect(screen.getByText(/very weak/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^password$/i), "defGHIjkl123!@#456");
    expect(await screen.findByText(/strong/i)).toBeInTheDocument();
  });

  it("calls POST /auth/register with the mapped payload and shows the success state on 201", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message: "If that email is available, an account has been created." }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/registration successful\. please verify your email\./i)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/register");
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      firstName: "Jane",
      lastName: "Trader",
      email: "jane@acme-capital.example",
      password: "correcthorsebattery1",
      acceptTerms: true,
      // WM-020D — now sent, names the organization OnboardingService
      // auto-creates once this account's email is verified.
      companyName: "Acme Capital",
    });
    // confirmPassword/marketingOptIn stay client-only — never sent.
    expect(body).not.toHaveProperty("confirmPassword");
    expect(body).not.toHaveProperty("marketingOptIn");
  });

  it("WM-020E — carries an ?invitationToken= from the URL through to registration", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("invitationToken=raw-invite-token"));
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message: "If that email is available, an account has been created." }, 201),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/registration successful\. please verify your email\./i)).toBeInTheDocument();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body.invitationToken).toBe("raw-invite-token");
  });

  it("shows a disabled, loading button label while the request is in flight", async () => {
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByRole("button", { name: /creating workspace/i })).toBeDisabled();

    resolveFetch(jsonResponse({ message: "ok" }, 201));
    expect(await screen.findByText(/registration successful/i)).toBeInTheDocument();
  });

  it("shows a duplicate-email error inline on the Business Email field, not as a generic banner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { success: false, data: null, error: { code: "EMAIL_ALREADY_EXISTS", message: "An account with this email already exists." } },
        400,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    const fieldError = await screen.findByText(/an account with this email already exists/i);
    expect(fieldError).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText(/business email/i)).toHaveAttribute("aria-invalid", "true");
    // Form stays on screen (not replaced by the success state) so the
    // trader can correct the email and resubmit.
    expect(screen.getByRole("button", { name: /create workspace/i })).toBeInTheDocument();
  });

  it("shows a generic failure banner for a non-duplicate-email server error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ success: false, data: null, error: { code: "VALIDATION_ERROR", message: "Password does not meet security requirements." } }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/password does not meet security requirements/i)).toBeInTheDocument();
  });

  it("shows a generic failure banner on network/unexpected errors", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderPage();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: /create workspace/i }));

    expect(await screen.findByText(/something went wrong\. please try again\./i)).toBeInTheDocument();
  });
});
