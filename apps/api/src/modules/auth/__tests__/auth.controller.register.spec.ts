// See auth.service.register.spec.ts for why @rmsm/database is mocked:
// AuthController statically imports AuthService, which imports the real
// `prisma` singleton — mocking the module keeps this a true unit test
// with no live-database dependency.
jest.mock("@rmsm/database", () => ({
  prisma: { emailVerification: { create: jest.fn() } },
}));

import type { Request } from "express";
import { AuthController } from "../auth.controller";
import type { AuthService } from "../auth.service";
import type { RegisterDto } from "../dto/register.dto";

function buildRequest(overrides?: Partial<Request>): Request {
  return {
    ip: "203.0.113.5",
    headers: { "user-agent": "vitest-agent" },
    ...overrides,
  } as Request;
}

describe("AuthController.register (WM-020B)", () => {
  it("forwards the DTO plus request-derived context to AuthService.register", async () => {
    const register = jest.fn().mockResolvedValue({ message: "If that email is available, an account has been created." });
    const authService = { register } as unknown as AuthService;
    const controller = new AuthController(authService);

    const dto: RegisterDto = {
      email: "jane@acme.example",
      password: "Str0ng!Passw0rd123",
      firstName: "Jane",
      lastName: "Trader",
      acceptTerms: true,
    };

    const result = await controller.register(dto, buildRequest());

    expect(register).toHaveBeenCalledWith(
      { email: "jane@acme.example", password: "Str0ng!Passw0rd123", firstName: "Jane", lastName: "Trader" },
      { ipAddress: "203.0.113.5", userAgent: "vitest-agent" },
    );
    expect(result).toEqual({ message: "If that email is available, an account has been created." });
  });

  it("does not forward acceptTerms to the service (never persisted — validated at the DTO layer only)", async () => {
    const register = jest.fn().mockResolvedValue({ message: "ok" });
    const authService = { register } as unknown as AuthService;
    const controller = new AuthController(authService);

    await controller.register(
      { email: "a@b.example", password: "Str0ng!Passw0rd123", acceptTerms: true } as RegisterDto,
      buildRequest(),
    );

    const [serviceInput] = register.mock.calls[0] as [Record<string, unknown>];
    expect(serviceInput).not.toHaveProperty("acceptTerms");
  });

  it("propagates AuthService errors (e.g. duplicate email) unchanged for the global exception filter to handle", async () => {
    const register = jest.fn().mockRejectedValue(new Error("boom"));
    const authService = { register } as unknown as AuthService;
    const controller = new AuthController(authService);

    await expect(
      controller.register({ email: "a@b.example", password: "Str0ng!Passw0rd123" } as RegisterDto, buildRequest()),
    ).rejects.toThrow("boom");
  });
});
