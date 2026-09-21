import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import LoginPage from "../page";

const pushMock = vi.fn();
const mutateAsyncMock = vi.fn();
const setRememberMeMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock("@/hooks/use-auth", () => ({
  useLogin: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

vi.mock("@/lib/auth-store", () => ({
  useAuthStore: (selector: (state: { setRememberMe: typeof setRememberMeMock }) => unknown) =>
    selector({
      setRememberMe: setRememberMeMock,
    }),
}));

vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {},
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects successful credential login to the trading workstation", async () => {
    mutateAsyncMock.mockResolvedValue({ status: "success" });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "trader@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/trading",
      );
    });
  });

  it("redirects successful 2FA login to the trading workstation", async () => {
    mutateAsyncMock
      .mockResolvedValueOnce({ status: "requires-2fa" })
      .mockResolvedValueOnce({ status: "success" });

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "trader@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "password" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(
        screen.getByLabelText("Authentication code"),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Authentication code"), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(
        "/trading",
      );
    });

    expect(pushMock).toHaveBeenCalledTimes(1);
  });
});
