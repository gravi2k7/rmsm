import { ValidationError } from "@rmsm/shared";

// See auth.service.register.spec.ts for why @rmsm/database is mocked.
const passwordResetCreate = jest.fn().mockResolvedValue({ id: "pr-new" });
const passwordResetFindUnique = jest.fn();
const passwordResetUpdate = jest.fn().mockResolvedValue({ id: "pr-1" });
const userUpdate = jest.fn().mockResolvedValue({ id: "user-1" });
const transaction = jest.fn((ops: Promise<unknown>[]) => Promise.all(ops));

jest.mock("@rmsm/database", () => ({
  prisma: {
    passwordReset: {
      create: (...args: unknown[]) => passwordResetCreate(...args),
      findUnique: (...args: unknown[]) => passwordResetFindUnique(...args),
      update: (...args: unknown[]) => passwordResetUpdate(...args),
    },
    user: {
      update: (...args: unknown[]) => userUpdate(...args),
    },
    $transaction: (...args: [Promise<unknown>[]]) => transaction(...args),
  },
}));

import { AuthService } from "../auth.service";

describe("AuthService password recovery (WM-020C)", () => {
  const config = {
    PASSWORD_RESET_TTL_MS: 60 * 60 * 1000,
    WEB_APP_URL: "http://localhost:3000",
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    passwordResetCreate.mockResolvedValue({ id: "pr-new" });
    passwordResetUpdate.mockResolvedValue({ id: "pr-1" });
    userUpdate.mockResolvedValue({ id: "user-1" });
    transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  });

  function buildService(overrides?: { user?: unknown }) {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(overrides?.user ?? null),
      findById: jest.fn(),
    };
    const sessionRepository = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
    const passwordService = { hash: jest.fn().mockResolvedValue("argon2-hash") };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      userRepository as never,
      sessionRepository as never,
      {} as never,
      passwordService as never,
      {} as never,
      {} as never,
      auditService as never,
      emailService as never,
      { publish: jest.fn() } as never, // eventPublisher — Module 004 addition
      config,
    );

    return { service, userRepository, sessionRepository, passwordService, auditService, emailService };
  }

  describe("forgotPassword", () => {
    it("creates a reset token and sends an email when the account exists", async () => {
      const { service, auditService, emailService } = buildService({
        user: { id: "user-1", email: "jane@acme.example" },
      });

      const result = await service.forgotPassword("jane@acme.example");

      expect(passwordResetCreate).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith("user.password_reset_requested", { userId: "user-1" });
      expect(result).toEqual({ message: "If that email exists, a reset link has been sent." });
    });

    it("never reveals whether the account exists — identical response, no token issued", async () => {
      const { service, emailService, auditService } = buildService({ user: null });

      const result = await service.forgotPassword("nobody@acme.example");

      expect(passwordResetCreate).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
      expect(result).toEqual({ message: "If that email exists, a reset link has been sent." });
    });
  });

  describe("resetPassword", () => {
    it("hashes the new password, marks the token used, revokes sessions, and audit-logs on a valid token", async () => {
      passwordResetFindUnique.mockResolvedValue({
        id: "pr-1",
        userId: "user-1",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const { service, sessionRepository, passwordService, auditService } = buildService();

      const result = await service.resetPassword("raw-token", "Str0ng!NewPassw0rd123");

      expect(passwordService.hash).toHaveBeenCalledWith("Str0ng!NewPassw0rd123");
      expect(passwordResetUpdate).toHaveBeenCalledWith({ where: { id: "pr-1" }, data: { usedAt: expect.any(Date) } });
      expect(userUpdate).toHaveBeenCalledWith({ where: { id: "user-1" }, data: { passwordHash: "argon2-hash" } });
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith("user-1");
      expect(auditService.log).toHaveBeenCalledWith("user.password_reset_completed", { userId: "user-1" });
      expect(result).toEqual({ message: expect.stringContaining("reset") });
    });

    it("rejects a token that doesn't exist", async () => {
      passwordResetFindUnique.mockResolvedValue(null);
      const { service } = buildService();

      await expect(service.resetPassword("bogus", "Str0ng!NewPassw0rd123")).rejects.toBeInstanceOf(ValidationError);
      expect(transaction).not.toHaveBeenCalled();
    });

    it("rejects an expired token", async () => {
      passwordResetFindUnique.mockResolvedValue({
        id: "pr-1",
        userId: "user-1",
        usedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
      });
      const { service } = buildService();

      await expect(service.resetPassword("expired", "Str0ng!NewPassw0rd123")).rejects.toBeInstanceOf(ValidationError);
      expect(transaction).not.toHaveBeenCalled();
    });

    it("rejects a token that has already been used (cannot be reused)", async () => {
      passwordResetFindUnique.mockResolvedValue({
        id: "pr-1",
        userId: "user-1",
        usedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60_000),
      });
      const { service } = buildService();

      await expect(service.resetPassword("already-used", "Str0ng!NewPassw0rd123")).rejects.toBeInstanceOf(ValidationError);
      expect(transaction).not.toHaveBeenCalled();
    });
  });
});
