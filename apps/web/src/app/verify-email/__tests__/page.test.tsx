import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import VerifyEmailPage from "../page";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const searchParamsMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
}));

describe("VerifyEmailPage (WM-020C)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a missing-token state and the resend form when no token is present, without calling the API", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<VerifyEmailPage />, { wrapper });

    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /resend verification email/i })).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("auto-verifies on mount when a token is present, showing a loading state then success", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=raw-token"));
    let resolveFetch: (value: Response) => void = () => {};
    const fetchMock = vi.fn().mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve)));
    vi.stubGlobal("fetch", fetchMock);

    render(<VerifyEmailPage />, { wrapper });

    expect(await screen.findByRole("status")).toHaveTextContent(/verifying your email/i);

    resolveFetch(jsonResponse({ message: "Email verified successfully." }));

    expect(await screen.findByText(/email verified successfully/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to login/i })).toHaveAttribute("href", "/login");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/verify-email");
    expect(JSON.parse(init.body as string)).toEqual({ token: "raw-token" });
  });

  it("shows the backend's invalid/expired-token message and the resend form on failure", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=stale-token"));
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Invalid or expired verification token." } }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<VerifyEmailPage />, { wrapper });

    expect(await screen.findByText(/invalid or expired verification token/i)).toBeInTheDocument();
    expect(screen.getByRole("form", { name: /resend verification email/i })).toBeInTheDocument();
  });

  it("resend form posts to /auth/resend-verification and shows a generic confirmation", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<VerifyEmailPage />, { wrapper });

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

    render(<VerifyEmailPage />, { wrapper });

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /resend verification email/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
