import { AppError, ValidationError } from "@rmsm/shared";

// AuthService imports `prisma` from `@rmsm/database` directly (used only
// by the email-verification helpers this register() flow calls into).
// The real package initializes a live `PrismaClient` at module load time,
// which requires a generated client matching the current schema — not
// available in every environment this suite runs in. Mocking the module
// keeps this a true unit test (no live DB dependency) and sidesteps that
// entirely, independent of environment.
jest.mock("@rmsm/database", () => ({
  prisma: {
    emailVerification: { create: jest.fn().mockResolvedValue({ id: "ev-1" }) },
  },
}));

import { AuthService } from "../auth.service";

describe("AuthService.register (WM-020B)", () => {
  const config = {
    EMAIL_VERIFICATION_TTL_MS: 3_600_000,
    WEB_APP_URL: "http://localhost:3000",
  } as never;

  function buildService(overrides?: { existingUser?: unknown }) {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(overrides?.existingUser ?? null),
      create: jest.fn().mockResolvedValue({ id: "user-1", email: "jane@acme.example", profile: {} }),
    };
    const passwordService = {
      hash: jest.fn().mockResolvedValue("argon2-hash"),
    };
    const auditService = { log: jest.fn().mockResolvedValue(undefined) };
    const emailService = { send: jest.fn().mockResolvedValue(undefined) };

    const service = new AuthService(
      userRepository as never,
      {} as never, // sessionRepository — unused by register()
      {} as never, // refreshTokenRepository — unused by register()
      passwordService as never,
      {} as never, // tokenService — unused by register()
      {} as never, // twoFactorService — unused by register()
      auditService as never,
      emailService as never,
      config,
    );

    return { service, userRepository, passwordService, auditService, emailService };
  }

  it("hashes the password, persists the user with firstName/lastName, and issues email verification", async () => {
    const { service, userRepository, passwordService, auditService, emailService } = buildService();

    const result = await service.register(
      { email: "jane@acme.example", password: "Str0ng!Passw0rd123", firstName: "Jane", lastName: "Trader" },
      { ipAddress: "127.0.0.1", userAgent: "vitest" },
    );

    expect(passwordService.hash).toHaveBeenCalledWith("Str0ng!Passw0rd123");
    expect(userRepository.create).toHaveBeenCalledWith({
      email: "jane@acme.example",
      passwordHash: "argon2-hash",
      firstName: "Jane",
      lastName: "Trader",
    });
    expect(emailService.send).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith("user.registered", expect.objectContaining({ userId: "user-1" }));
    expect(result).toEqual({ message: expect.stringContaining("account has been created") });
  });

  it("supports the legacy email/password-only path (no firstName/lastName)", async () => {
    const { service, userRepository } = buildService();

    await service.register({ email: "legacy@acme.example", password: "Str0ng!Passw0rd123" }, {});

    expect(userRepository.create).toHaveBeenCalledWith({
      email: "legacy@acme.example",
      passwordHash: "argon2-hash",
      firstName: undefined,
      lastName: undefined,
    });
  });

  it("rejects a duplicate email with a 400 EMAIL_ALREADY_EXISTS error and never calls create()", async () => {
    const { service, userRepository } = buildService({ existingUser: { id: "existing-user" } });

    await expect(
      service.register({ email: "taken@acme.example", password: "Str0ng!Passw0rd123" }, {}),
    ).rejects.toMatchObject({ statusCode: 400, code: "EMAIL_ALREADY_EXISTS" });

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("rejects a weak password before ever touching the repository (delegates to PasswordService's policy)", async () => {
    const { service, userRepository, passwordService } = buildService();
    passwordService.hash.mockRejectedValue(new ValidationError("Password does not meet security requirements.", { failures: ["Must contain a symbol."] }));

    await expect(service.register({ email: "weak@acme.example", password: "notstrongenough" }, {})).rejects.toBeInstanceOf(ValidationError);

    expect(userRepository.create).not.toHaveBeenCalled();
  });

  it("EMAIL_ALREADY_EXISTS is an AppError with the shape the global exception filter maps to a 400 response", () => {
    const error = new AppError("An account with this email already exists.", "EMAIL_ALREADY_EXISTS", 400);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe("EMAIL_ALREADY_EXISTS");
  });
});
