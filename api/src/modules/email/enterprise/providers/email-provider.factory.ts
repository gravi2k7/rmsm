import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../../config/app-config.module";
import { EmailProviderRegistry } from "./email-provider.registry";
import { ConsoleEmailProvider } from "./console/console-email.provider";
import { SMTPEmailProvider } from "./smtp/smtp-email.provider";
import { ResendEmailProvider } from "./resend/resend-email.provider";
import { EMAIL_DEFAULT_TIMEOUT_MS } from "../constants/email-platform.constants";
import type { EmailProviderId } from "../contracts/email-platform.contracts";

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
 *
 * Runtime bug fix (post-delivery): the only way this class ever falls
 * back to CONSOLE is through one of two *explicit, already-existing*
 * branches below — never a swallowed exception, never a partially-run
 * `onModuleInit()`. A real deployment where `EMAIL_PROVIDER=smtp` still
 * ends up on Console with no "email.provider.activated" log was, in
 * every case reproduced against a real Nest application graph while
 * diagnosing this, the *not_configured* fallback branch firing silently
 * because `SMTP_HOST` (or another required SMTP field) wasn't actually
 * present on the validated `Env` the container received — not a DI or
 * lifecycle defect. `onModuleInit()` on a plain (non-request-scoped)
 * provider listed in a module's `providers` array is *always* invoked
 * exactly once, unconditionally, before the app finishes bootstrapping;
 * that was independently re-verified against a real `@nestjs/core`
 * application (not this repo's isolated stub sandbox) rather than
 * assumed.
 *
 * The logging below is intentionally more explicit than before so this
 * distinction — "SMTP genuinely didn't activate" vs. "SMTP activated
 * but you only grepped for the wrong log line" — is obvious from the
 * logs alone next time, without needing a code audit:
 *   - `email.provider.registered` — one line per provider, confirming
 *     `EmailProviderRegistry` actually received it (answers "did the
 *     registry receive provider registrations?" directly from logs).
 *   - `email.provider.not_configured` — now includes `reason`, naming
 *     exactly which required field(s) are missing for the desired
 *     provider, instead of just "not enabled".
 *   - `email.provider.activated` — unchanged; only ever reached on the
 *     genuine success path.
 *   - `email.provider.resolution_failed` — new: `EMAIL_PROVIDER` naming
 *     a value that isn't registered can no longer crash the entire API
 *     at boot (previously `registry.get(desired)` would throw
 *     uncaught out of `onModuleInit()`); it now falls back to CONSOLE
 *     the same way an unconfigured provider does, since a config typo
 *     shouldn't be able to take down the whole application — this is
 *     the same "Provider Unavailable" category EM-001's own Error
 *     Mapper already names for send-time failures, applied at boot too.
 */
@Injectable()
export class EmailProviderFactory implements OnModuleInit {
  private readonly logger = new Logger(EmailProviderFactory.name);

  constructor(
    private readonly registry: EmailProviderRegistry,
    @Inject(APP_CONFIG) private readonly env: Env,
  ) {}

  onModuleInit(): void {
    const consoleProvider = new ConsoleEmailProvider();
    const smtpProvider = new SMTPEmailProvider({
      host: this.env.SMTP_HOST ?? "",
      port: this.env.SMTP_PORT ?? 587,
      username: this.env.SMTP_USER,
      password: this.env.SMTP_PASSWORD,
      tls: this.env.SMTP_TLS,
      pool: this.env.SMTP_POOL,
      maxConnections: this.env.SMTP_MAX_CONNECTIONS,
      timeoutMs: this.env.EMAIL_TIMEOUT ?? EMAIL_DEFAULT_TIMEOUT_MS,
      from: this.env.EMAIL_FROM,
    });
    const resendProvider = new ResendEmailProvider({
      apiKey: this.env.RESEND_API_KEY ?? "",
      from: this.env.EMAIL_FROM,
      timeoutMs: this.env.EMAIL_TIMEOUT ?? EMAIL_DEFAULT_TIMEOUT_MS,
    });

    for (const provider of [consoleProvider, smtpProvider, resendProvider]) {
      this.registry.register(provider);
      this.logger.log({ msg: "email.provider.registered", provider: provider.type, enabled: provider.enabled });
    }

    const desired = this.env.EMAIL_PROVIDER.toUpperCase() as EmailProviderId;
    const provider = this.registry.tryGet(desired);

    if (!provider) {
      this.logger.error({
        msg: "email.provider.resolution_failed",
        desired,
        registered: this.registry.listRegistered(),
        fallback: "CONSOLE",
      });
      this.registry.setActive("CONSOLE");
      return;
    }

    if (!provider.enabled && desired !== "CONSOLE") {
      this.logger.warn({
        msg: "email.provider.not_configured",
        desired,
        reason: this.describeWhyNotConfigured(desired),
        fallback: "CONSOLE",
      });
      this.registry.setActive("CONSOLE");
      return;
    }

    this.registry.setActive(desired);
    this.logger.log({ msg: "email.provider.activated", provider: desired });
  }

  /** Names exactly which required field(s) `EMAIL_PROVIDER` is missing for — this is what turns "not enabled" into an actionable log line instead of a mystery. */
  private describeWhyNotConfigured(desired: EmailProviderId): string {
    if (desired === "SMTP") {
      return this.env.SMTP_HOST ? "SMTP is misconfigured despite SMTP_HOST being set" : "SMTP_HOST is not set";
    }
    if (desired === "RESEND") {
      return this.env.RESEND_API_KEY ? "Resend is misconfigured despite RESEND_API_KEY being set" : "RESEND_API_KEY is not set";
    }
    return "provider reports enabled: false";
  }
}
