// See auth.service.register.spec.ts for why @rmsm/database is mocked —
// AuthController statically imports AuthService, which imports the real
// `prisma` singleton.
jest.mock("@rmsm/database", () => ({
  prisma: { emailVerification: { create: jest.fn() } },
}));

import { AuthController } from "../auth.controller";
import type { AuthService } from "../auth.service";

describe("AuthController email verification & password recovery (WM-020C)", () => {
  it("verify-email forwards the token to AuthService.verifyEmail", async () => {
    const verifyEmail = jest.fn().mockResolvedValue({ message: "Email verified successfully." });
    const authService = { verifyEmail } as unknown as AuthService;
    const controller = new AuthController(authService);

    const result = await controller.verifyEmail({ token: "raw-token" });

    expect(verifyEmail).toHaveBeenCalledWith("raw-token");
    expect(result).toEqual({ message: "Email verified successfully." });
  });

  it("resend-verification forwards the email to AuthService.resendVerification", async () => {
    const resendVerification = jest.fn().mockResolvedValue({ message: "ok" });
    const authService = { resendVerification } as unknown as AuthService;
    const controller = new AuthController(authService);

    const result = await controller.resendVerification({ email: "jane@acme.example" });

    expect(resendVerification).toHaveBeenCalledWith("jane@acme.example");
    expect(result).toEqual({ message: "ok" });
  });

  it("forgot-password forwards the email to AuthService.forgotPassword", async () => {
    const forgotPassword = jest.fn().mockResolvedValue({ message: "If that email exists, a reset link has been sent." });
    const authService = { forgotPassword } as unknown as AuthService;
    const controller = new AuthController(authService);

    const result = await controller.forgotPassword({ email: "jane@acme.example" });

    expect(forgotPassword).toHaveBeenCalledWith("jane@acme.example");
    expect(result).toEqual({ message: "If that email exists, a reset link has been sent." });
  });

  it("reset-password forwards the token and new password to AuthService.resetPassword", async () => {
    const resetPassword = jest.fn().mockResolvedValue({ message: "Password has been reset. Please log in again." });
    const authService = { resetPassword } as unknown as AuthService;
    const controller = new AuthController(authService);

    const result = await controller.resetPassword({ token: "raw-token", newPassword: "Str0ng!NewPassw0rd123" });

    expect(resetPassword).toHaveBeenCalledWith("raw-token", "Str0ng!NewPassw0rd123");
    expect(result).toEqual({ message: "Password has been reset. Please log in again." });
  });

  it("propagates AuthService errors (e.g. expired/invalid token) unchanged for the global exception filter", async () => {
    const verifyEmail = jest.fn().mockRejectedValue(new Error("Invalid or expired verification token."));
    const authService = { verifyEmail } as unknown as AuthService;
    const controller = new AuthController(authService);

    await expect(controller.verifyEmail({ token: "bad" })).rejects.toThrow("Invalid or expired verification token.");
  });
});
