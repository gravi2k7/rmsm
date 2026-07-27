import { ValidationError } from "@rmsm/shared";

// See auth.service.register.spec.ts for why @rmsm/database is mocked —
// AuthService imports the real `prisma` singleton, which needs a
// generated client this sandbox can't produce. Mocking keeps these true
// unit tests with no live-DB dependency.
const emailVerificationCreate = jest.fn().mockResolvedValue({ id: "ev-new" });
const emailVerificationFindUnique = jest.fn();
const emailVerificationUpdate = jest.fn().mockResolvedValue({ id: "ev-1" });
const emailVerificationDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
const userUpdate = jest.fn().mockResolvedValue({ id: "user-1" });
const transaction = jest.fn((ops: Promise<unknown>[]) => Promise.all(ops));

jest.mock("@rmsm/database", () => ({
  prisma: {
    emailVerification: {
      create: (...args: unknown[]) => emailVerificationCreate(...args),
      findUnique: (...args: unknown[]) => emailVerificationFindUnique(...args),
      update: (...args: unknown[]) => emailVerificationUpdate(...args),
      deleteMany: (...args: unknown[]) => emailVerificationDeleteMany(...args),
    },
    user: {
      update: (...args: unknown[]) => userUpdate(...args),
    },
    $transaction: (...args: [Promise<unknown>[]]) => transaction(...args),
  },
}));

import { AuthService } from "../auth.service";

describe("AuthService email verification (WM-020C)", () => {
  const config = {
    EMAIL_VERIFICATION_TTL_MS: 24 * 60 * 60 * 1000,
    WEB_APP_URL: "http://localhost:3000",
  } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    emailVerificationCreate.mockResolvedValue({ id: "ev-new" });
    emailVerificationUpdate.mockResolvedValue({ id: "ev-1" });
    emailVerificationDeleteMany.mockResolvedValue({ count: 0 });
    userUpdate.mockResolvedValue({ id: "user-1" });
    transaction.mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops));
  });

  function buildService(overrides?: { user?: unknown }) {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(overrides?.user ?? null),
      findById: jest.fn().mockResolvedValue({ id: "user-1", email: "jane@acme.example" }),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      userRepository as never,
      {} as never,
      {} as never,
      {} as never, // passwordService — unused by these flows
      {} as never,
      {} as never,
      auditService as never,
      emailService as never,
      config,
    );

    return { service, userRepository, auditService, emailService };
  }

  describe("verifyEmail", () => {
    it("marks the token and user verified, sends a welcome email, and audit-logs on a valid token", async () => {
      emailVerificationFindUnique.mockResolvedValue({
        id: "ev-1",
        userId: "user-1",
        verifiedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      const { service, auditService, emailService } = buildService();

      const result = await service.verifyEmail("raw-token");

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(emailVerificationUpdate).toHaveBeenCalledWith({
        where: { id: "ev-1" },
        data: { verifiedAt: expect.any(Date) },
      });
      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { status: "ACTIVE", emailVerifiedAt: expect.any(Date) },
      });
      expect(emailService.send).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith("user.email_verified", { userId: "user-1" });
      expect(result).toEqual({ message: expect.stringContaining("verified successfully"), userId: "user-1" });
    });

    it("rejects a token that doesn't exist", async () => {
      emailVerificationFindUnique.mockResolvedValue(null);
      const { service } = buildService();

      await expect(service.verifyEmail("bogus")).rejects.toBeInstanceOf(ValidationError);
      expect(transaction).not.toHaveBeenCalled();
    });

    it("rejects an expired token", async () => {
      emailVerificationFindUnique.mockResolvedValue({
        id: "ev-1",
        userId: "user-1",
        verifiedAt: null,
        expiresAt: new Date(Date.now() - 1_000),
      });
      const { service } = buildService();

      await expect(service.verifyEmail("expired")).rejects.toBeInstanceOf(ValidationError);
      expect(transaction).not.toHaveBeenCalled();
    });

    it("rejects an already-used token (cannot be reused)", async () => {
      emailVerificationFindUnique.mockResolvedValue({
        id: "ev-1",
        userId: "user-1",
        verifiedAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 60_000),
      });
      const { service } = buildService();

      await expect(service.verifyEmail("already-used")).rejects.toBeInstanceOf(ValidationError);
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe("resendVerification", () => {
    it("deletes stale unverified tokens, issues a fresh one, and audit-logs for an unverified account", async () => {
      const { service, userRepository, auditService, emailService } = buildService({
        user: { id: "user-1", email: "jane@acme.example", emailVerifiedAt: null },
      });

      const result = await service.resendVerification("jane@acme.example");

      expect(emailVerificationDeleteMany).toHaveBeenCalledWith({ where: { userId: "user-1", verifiedAt: null } });
      expect(emailVerificationCreate).toHaveBeenCalledTimes(1);
      expect(emailService.send).toHaveBeenCalledTimes(1);
      expect(auditService.log).toHaveBeenCalledWith("user.verification_resent", { userId: "user-1" });
      expect(result).toEqual({ message: expect.stringContaining("has been sent") });
      void userRepository;
    });

    it("is a silent no-op with a generic response for an already-verified account (never reveals state)", async () => {
      const { service, auditService, emailService } = buildService({
        user: { id: "user-1", email: "jane@acme.example", emailVerifiedAt: new Date() },
      });

      const result = await service.resendVerification("jane@acme.example");

      expect(emailVerificationDeleteMany).not.toHaveBeenCalled();
      expect(emailVerificationCreate).not.toHaveBeenCalled();
      expect(emailService.send).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
      expect(result).toEqual({ message: expect.stringContaining("has been sent") });
    });

    it("returns the identical generic response for a non-existent email (anti-enumeration)", async () => {
      const { service } = buildService({ user: null });

      const result = await service.resendVerification("nobody@acme.example");

      expect(emailVerificationCreate).not.toHaveBeenCalled();
      expect(result).toEqual({ message: "If that account exists and needs verification, a new link has been sent." });
    });
  });
});
