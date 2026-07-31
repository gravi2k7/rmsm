import { z } from "zod";
import { durationMs } from "../env/env.parser";

/**
 * Authentication and identity. Includes the auth-flow email settings
 * (verification/password-reset emails, SMTP) — grouped here rather than
 * under a dedicated "notifications" domain (not one of this task's six
 * named domains) because every one of these vars exists specifically to
 * serve an authentication flow, not general-purpose notification
 * delivery. All validators/defaults unchanged from the original flat
 * `envSchema`.
 */
export const authSchema = z.object({
  // JWT
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // Account lockout / password policy
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().default(5),
  ACCOUNT_LOCKOUT_DURATION_MS: durationMs(15 * 60 * 1000),
  PASSWORD_MIN_LENGTH: z.coerce.number().default(12),
  EMAIL_VERIFICATION_TTL_MS: durationMs(24 * 60 * 60 * 1000),
  PASSWORD_RESET_TTL_MS: durationMs(60 * 60 * 1000),

  // 2FA secret encryption (AES-256-GCM key, 32 bytes hex-encoded = 64 chars)
  TWO_FACTOR_ENCRYPTION_KEY: z.string().min(32).default("0".repeat(64)),
  TWO_FACTOR_ISSUER: z.string().default("RMSM AI"),

  // Cookies
  COOKIE_SECRET: z.string().min(16).default("dev-cookie-secret-change-me!!"),

  // OAuth (all optional — provider is disabled if its client id/secret are absent)
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_GOOGLE_CALLBACK_URL: z.string().optional(),
  OAUTH_GITHUB_CLIENT_ID: z.string().optional(),
  OAUTH_GITHUB_CLIENT_SECRET: z.string().optional(),
  OAUTH_GITHUB_CALLBACK_URL: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_ID: z.string().optional(),
  OAUTH_MICROSOFT_CLIENT_SECRET: z.string().optional(),
  OAUTH_MICROSOFT_CALLBACK_URL: z.string().optional(),

  // Auth-flow email (verification, password reset)
  // EM-001 widens this to "resend" — additive; "console" remains the default and every existing value is unaffected.
  EMAIL_PROVIDER: z.enum(["console", "smtp", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("RMSM AI <no-reply@rmsm.ai>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
});

export type AuthEnv = z.infer<typeof authSchema>;
