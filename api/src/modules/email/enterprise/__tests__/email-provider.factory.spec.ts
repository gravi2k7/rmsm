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
});
