import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithQueryClient } from "@/test/render-with-query";
import userEvent from "@testing-library/user-event";
import { TwoFactorManagement } from "../two-factor-management";
import { useAuthStore } from "@/lib/auth-store";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function renderComponent() {
  return renderWithQueryClient(<TwoFactorManagement />);
}

describe("TwoFactorManagement", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows 'Unknown' status on a fresh render (no status endpoint exists)", () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    renderComponent();
    expect(screen.getByText("Unknown")).toBeInTheDocument();
  });

  it("starting setup fetches a QR code and shows the verification step", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ otpauthUrl: "otpauth://totp/x", qrCodeDataUrl: "data:image/png;base64,abc" })));
    const user = userEvent.setup();

    renderComponent();
    await user.click(screen.getByRole("button", { name: /set up 2fa/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    });
  });

  it("confirming with a valid code shows recovery codes and marks status enabled", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ otpauthUrl: "otpauth://totp/x", qrCodeDataUrl: "data:image/png;base64,abc" }))
      .mockResolvedValueOnce(jsonResponse({ message: "ok", recoveryCodes: ["AAAA-1111", "BBBB-2222"] }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderComponent();
    await user.click(screen.getByRole("button", { name: /set up 2fa/i }));
    await waitFor(() => expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/verification code/i), "123456");
    await user.click(screen.getByRole("button", { name: /verify and enable/i }));

    await waitFor(() => {
      expect(screen.getByText("AAAA-1111")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^done$/i }));
    expect(screen.getByText("Enabled")).toBeInTheDocument();
  });

  it("disabling requires a password and calls the disable endpoint", async () => {
    useAuthStore.setState({ accessToken: "t", refreshToken: "r", user: null });
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "disabled" }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderComponent();
    await user.click(screen.getByRole("button", { name: /disable 2fa/i }));
    await user.type(screen.getByLabelText(/confirm your password/i), "hunter2");
    await user.click(screen.getByRole("button", { name: /^disable 2fa$/i }));

    await waitFor(() => {
      const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain("/auth/2fa/disable");
      expect(JSON.parse(init.body as string)).toEqual({ password: "hunter2" });
    });
  });
});
