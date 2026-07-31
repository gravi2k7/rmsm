import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import { EmailProviderRegistry } from "./email-provider.registry";
import { ConsoleEmailProvider } from "./console/console-email.provider";
import { SMTPEmailProvider } from "./smtp/smtp-email.provider";
import { ResendEmailProvider } from "./resend/resend-email.provider";
import { EMAIL_DEFAULT_TIMEOUT_MS } from "../constants/email-platform.constants";

/**
 * EM-001's own Provider Factory section: "Automatically resolve provider
 * using configuration." Registers all three current providers with
 * `EmailProviderRegistry` on boot (Console is always constructed — it
 * has no credentials to be missing — SMTP/Resend are constructed
 * regardless of whether they're configured, matching every
 * `enabled`-gated provider convention since MD-001; an unconfigured
 * provider simply reports `enabled: false`) and activates whichever one
 * `EMAIL_PROVIDER` names. No direct `process.env` — every value flows
 * through the injected `Env`.
 */
@Injectable()
export class EmailProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(
    private readonly registry: EmailProviderRegistry,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    this.registry.register(new ConsoleEmailProvider());
    this.registry.register(
      new SMTPEmailProvider({
        host: this.env.SMTP_HOST ?? "",
        port: this.env.SMTP_PORT ?? 587,
        username: this.env.SMTP_USER,
        password: this.env.SMTP_PASSWORD,
        tls: this.env.SMTP_TLS,
        pool: this.env.SMTP_POOL,
        maxConnections: this.env.SMTP_MAX_CONNECTIONS,
        timeoutMs: this.env.EMAIL_TIMEOUT ?? EMAIL_DEFAULT_TIMEOUT_MS,
        from: this.env.EMAIL_FROM,
      }),
    );
    this.registry.register(
      new ResendEmailProvider({
        apiKey: this.env.RESEND_API_KEY ?? "",
        from: this.env.EMAIL_FROM,
        timeoutMs: this.env.EMAIL_TIMEOUT ?? EMAIL_DEFAULT_TIMEOUT_MS,
      }),
    );

    const desired = this.env.EMAIL_PROVIDER.toUpperCase() as "CONSOLE" | "SMTP" | "RESEND";
    const provider = this.registry.get(desired);
    if (!provider.enabled && desired !== "CONSOLE") {
      this.logger.warn({ msg: "email.provider.not_configured", desired, fallback: "CONSOLE" });
      this.registry.setActive("CONSOLE");
      return;
    }
    this.registry.setActive(desired);
    this.logger.log({ msg: "email.provider.activated", provider: desired });
  }
}
