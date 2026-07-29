import { afterEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQueryClient } from "@/test/render-with-query";
import ResetPasswordPage from "../page";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const searchParamsMock = vi.fn();
const routerPushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
  useRouter: () => ({ push: routerPushMock }),
}));

async function fillPasswords(user: ReturnType<typeof userEvent.setup>, password = "correcthorsebattery1", confirm = password) {
  await user.type(screen.getByLabelText(/^new password$/i), password);
  await user.type(screen.getByLabelText(/confirm new password/i), confirm);
}

describe("ResetPasswordPage (WM-020C)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    routerPushMock.mockClear();
  });

  it("shows a missing-token state and disables the form when no token is present", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams(""));
    renderWithQueryClient(<ResetPasswordPage />);

    expect(screen.getByText(/missing its token/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeDisabled();
  });

  it("requires matching password confirmation", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=raw-token"));
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordPage />);

    await fillPasswords(user, "correcthorsebattery1", "somethingelse123456");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/passwords don't match/i)).toBeInTheDocument();
  });

  it("posts the token and new password, then shows the success state with a login link", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=raw-token"));
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Password has been reset. Please log in again." }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordPage />);

    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/your password has been reset/i)).toBeInTheDocument();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/reset-password");
    expect(JSON.parse(init.body as string)).toEqual({ token: "raw-token", newPassword: "correcthorsebattery1" });

    await user.click(screen.getByRole("button", { name: /go to login/i }));
    expect(routerPushMock).toHaveBeenCalledWith("/login");
  });

  it("shows the backend's invalid/expired-token message on a rejected token (never distinguishes which, by design)", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("token=stale-token"));
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: "VALIDATION_ERROR", message: "Invalid or expired reset token." } }, 400),
    );
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    renderWithQueryClient(<ResetPasswordPage />);

    await fillPasswords(user);
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(await screen.findByText(/invalid or expired reset token/i)).toBeInTheDocument();
  });
});
