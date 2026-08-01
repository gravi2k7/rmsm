import { Logger } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { EmailProviderFactory } from "../providers/email-provider.factory";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { ConsoleEmailProvider } from "../providers/console/console-email.provider";
import { SMTPEmailProvider } from "../providers/smtp/smtp-email.provider";
import { ResendEmailProvider } from "../providers/resend/resend-email.provider";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    EMAIL_PROVIDER: "console",
    EMAIL_FROM: "RMSM <no-reply@rmsm.ai>",
    SMTP_HOST: undefined,
    SMTP_PORT: undefined,
    SMTP_USER: undefined,
    SMTP_PASSWORD: undefined,
    SMTP_TLS: true,
    SMTP_POOL: true,
    SMTP_MAX_CONNECTIONS: 5,
    RESEND_API_KEY: undefined,
    EMAIL_TIMEOUT: 10_000,
    ...overrides,
  } as Env;
}

describe("EmailProviderFactory", () => {
  it("registers all three providers (Console/SMTP/Resend) on module init", () => {
    const registry = new EmailProviderRegistry();
    new EmailProviderFactory(registry, buildEnv()).onModuleInit();

    expect(registry.listRegistered().sort()).toEqual(["CONSOLE", "RESEND", "SMTP"]);
  });

  it("activates CONSOLE by default", () => {
    const registry = new EmailProviderRegistry();
    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "console" })).onModuleInit();

    expect(registry.getActive()).toBeInstanceOf(ConsoleEmailProvider);
  });

  it("activates SMTP when EMAIL_PROVIDER=smtp and SMTP is fully configured", () => {
    const registry = new EmailProviderRegistry();
    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.example.com", SMTP_PORT: 587, SMTP_USER: "u", SMTP_PASSWORD: "p" })).onModuleInit();

    expect(registry.getActive()).toBeInstanceOf(SMTPEmailProvider);
  });

  it("activates RESEND when EMAIL_PROVIDER=resend and an API key is configured", () => {
    const registry = new EmailProviderRegistry();
    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: "re_test" })).onModuleInit();

    expect(registry.getActive()).toBeInstanceOf(ResendEmailProvider);
  });

  it("falls back to CONSOLE when EMAIL_PROVIDER names a provider that isn't actually configured", () => {
    const registry = new EmailProviderRegistry();
    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "smtp", SMTP_HOST: undefined })).onModuleInit();

    expect(registry.getActive()).toBeInstanceOf(ConsoleEmailProvider);
  });

  it("constructs SMTP from the injected Env's own SMTP_HOST — never a hardcoded or process.env value", () => {
    const registry = new EmailProviderRegistry();
    const env = buildEnv({ EMAIL_PROVIDER: "smtp", SMTP_HOST: "smtp.example.com", SMTP_PORT: 587, SMTP_USER: "u", SMTP_PASSWORD: "p" });
    new EmailProviderFactory(registry, env).onModuleInit();

    expect(registry.get("SMTP").enabled).toBe(true);
  });

  it("logs a registration confirmation for every provider it registers", () => {
    const registry = new EmailProviderRegistry();
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

    new EmailProviderFactory(registry, buildEnv()).onModuleInit();

    const registeredCalls = logSpy.mock.calls.filter(([arg]) => typeof arg === "object" && (arg as { msg?: string }).msg === "email.provider.registered");
    expect(registeredCalls.map(([arg]) => (arg as { provider: string }).provider).sort()).toEqual(["CONSOLE", "RESEND", "SMTP"]);

    logSpy.mockRestore();
  });

  it("logs email.provider.activated only on the success path, never on a fallback", () => {
    const registry = new EmailProviderRegistry();
    const logSpy = jest.spyOn(Logger.prototype, "log").mockImplementation(() => undefined);

    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "smtp", SMTP_HOST: undefined })).onModuleInit();

    const activatedCalls = logSpy.mock.calls.filter(([arg]) => typeof arg === "object" && (arg as { msg?: string }).msg === "email.provider.activated");
    expect(activatedCalls).toHaveLength(0);

    logSpy.mockRestore();
  });

  it("names the specific missing field when SMTP is desired but not configured", () => {
    const registry = new EmailProviderRegistry();
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "smtp", SMTP_HOST: undefined })).onModuleInit();

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ msg: "email.provider.not_configured", desired: "SMTP", reason: "SMTP_HOST is not set" }));

    warnSpy.mockRestore();
  });

  it("names the specific missing field when RESEND is desired but not configured", () => {
    const registry = new EmailProviderRegistry();
    const warnSpy = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined);

    new EmailProviderFactory(registry, buildEnv({ EMAIL_PROVIDER: "resend", RESEND_API_KEY: undefined })).onModuleInit();

    expect(warnSpy).toHaveBeenCalledWith(expect.objectContaining({ msg: "email.provider.not_configured", desired: "RESEND", reason: "RESEND_API_KEY is not set" }));

    warnSpy.mockRestore();
  });

  it("never throws out of onModuleInit — an unregistered/invalid EMAIL_PROVIDER value falls back to CONSOLE instead of crashing boot", () => {
    const registry = new EmailProviderRegistry();
    const errorSpy = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    const env = buildEnv({ EMAIL_PROVIDER: "sendgrid" as Env["EMAIL_PROVIDER"] });

    expect(() => new EmailProviderFactory(registry, env).onModuleInit()).not.toThrow();
    expect(registry.getActive()).toBeInstanceOf(ConsoleEmailProvider);
    expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({ msg: "email.provider.resolution_failed", desired: "SENDGRID", fallback: "CONSOLE" }));

    errorSpy.mockRestore();
  });
});
