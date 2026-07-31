import { z } from "zod";
import { booleanFromString, durationMs } from "../env/env.parser";

/**
 * EM-001 Enterprise Email Platform settings. `EMAIL_PROVIDER`/`EMAIL_FROM`/
 * `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASSWORD` already exist in
 * `auth.schema.ts` (added when Authentication's own email flow was
 * built, before this platform existed) — deliberately left there rather
 * than moved here, since moving them would be a breaking rename of
 * fields on the merged `Env` type for zero behavioral benefit. This file
 * holds only the genuinely new vars EM-001's own Configuration section
 * introduces: SMTP connection-pool/TLS-nuance settings its "SMTP
 * Provider" section names, `RESEND_API_KEY`, and the Queue/Retry/Timeout/
 * Cache settings its own Queue/Retry/Configuration/Cache sections name.
 */
export const emailSchema = z.object({
  /** Force STARTTLS (or implicit TLS at port 465) — see `SMTPEmailProvider`'s own doc comment for exactly how this maps onto nodemailer's `secure`/`requireTLS` options. */
  SMTP_TLS: booleanFromString(true),
  /** EM-001's own "Connection Pool" requirement. */
  SMTP_POOL: booleanFromString(true),
  SMTP_MAX_CONNECTIONS: z.coerce.number().int().positive().default(5),

  RESEND_API_KEY: z.string().optional(),

  EMAIL_QUEUE_ENABLED: booleanFromString(true),
  EMAIL_RETRY_COUNT: z.coerce.number().int().min(0).default(5),
  EMAIL_RETRY_DELAY_MS: durationMs(1_000),
  EMAIL_TIMEOUT: durationMs(10_000),

  /** "Cache: Templates, Provider Configuration ... TTL configurable" (EM-001's own Cache section). */
  EMAIL_CACHE_TTL_MS: durationMs(300_000),
});

export type EmailEnv = z.infer<typeof emailSchema>;
