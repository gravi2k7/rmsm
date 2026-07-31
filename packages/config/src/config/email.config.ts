import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface EmailPlatformConfig {
  readonly provider: "console" | "smtp" | "resend";
  readonly from: string;
  readonly smtp: {
    readonly host: string | undefined;
    readonly port: number | undefined;
    readonly username: string | undefined;
    readonly tls: boolean;
    readonly pool: boolean;
    readonly maxConnections: number;
  };
  readonly resend: {
    readonly configured: boolean;
  };
  readonly queue: {
    readonly enabled: boolean;
    readonly retryCount: number;
    readonly retryDelayMs: number;
  };
  readonly timeoutMs: number;
  readonly cacheTtlMs: number;
}

/** Nested, domain-scoped view of the email platform's env vars, mirroring every other `config/*.config.ts` getter — never exposes `SMTP_PASSWORD`/`RESEND_API_KEY` themselves, only whether they're present. */
export function getEmailPlatformConfig(env: Env = loadConfig()): EmailPlatformConfig {
  return {
    provider: env.EMAIL_PROVIDER,
    from: env.EMAIL_FROM,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      username: env.SMTP_USER,
      tls: env.SMTP_TLS,
      pool: env.SMTP_POOL,
      maxConnections: env.SMTP_MAX_CONNECTIONS,
    },
    resend: {
      configured: Boolean(env.RESEND_API_KEY),
    },
    queue: {
      enabled: env.EMAIL_QUEUE_ENABLED,
      retryCount: env.EMAIL_RETRY_COUNT,
      retryDelayMs: env.EMAIL_RETRY_DELAY_MS,
    },
    timeoutMs: env.EMAIL_TIMEOUT,
    cacheTtlMs: env.EMAIL_CACHE_TTL_MS,
  };
}
