import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/render-with-query";
import ForgotPasswordPage from "../page";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("ForgotPasswordPage (WM-020C)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders an accessible email field and submit button", () => {
    renderWithQueryClient(<ForgotPasswordPage />);

    expect(screen.getByRole("heading", { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send reset link/i })).toBeInTheDocument();
  });

  it("shows a validation message for an invalid email and never calls the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to /auth/forgot-password and shows the generic success state (never reveals whether the email exists)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "If that email exists, a reset link has been sent." }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), "jane@acme.example");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/if an account exists for that email/i)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/forgot-password");
    expect(JSON.parse(init.body as string)).toEqual({ email: "jane@acme.example" });
  });

  it("shows a generic failure banner on a server/network error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Something went wrong. Please try again." } }, 500),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithQueryClient(<ForgotPasswordPage />);

    await user.type(screen.getByLabelText(/email/i), "jane@acme.example");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/something went wrong\. please try again\./i)).toBeInTheDocument();
  });

  it("links back to /login", () => {
    renderWithQueryClient(<ForgotPasswordPage />);
    expect(screen.getByRole("link", { name: /back to login/i })).toHaveAttribute("href", "/login");
  });
});
