import { z } from "zod";

/**
 * Every environment variable any Node app in RMSM AI is allowed to read.
 * No app should read process.env directly — always go through loadConfig().
 * Adding a new env var means adding it here first.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),

  // Database
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),

  // Redis
  REDIS_URL: z.string().startsWith("redis://"),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // AI service
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  AI_SERVICE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Ports
  API_PORT: z.coerce.number().default(3001),
  WEB_PORT: z.coerce.number().default(3000),
  ADMIN_PORT: z.coerce.number().default(3002),
  AI_PORT: z.coerce.number().default(8000),

  // Rate limiting
  RATE_LIMIT_TTL_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  // --- Module 002: Auth ---
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: z.coerce.number().default(5),
  ACCOUNT_LOCKOUT_DURATION_MS: z.coerce.number().default(15 * 60 * 1000),
  PASSWORD_MIN_LENGTH: z.coerce.number().default(12),
  EMAIL_VERIFICATION_TTL_MS: z.coerce.number().default(24 * 60 * 60 * 1000),
  PASSWORD_RESET_TTL_MS: z.coerce.number().default(60 * 60 * 1000),

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

  // Email
  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  EMAIL_FROM: z.string().default("RMSM AI <no-reply@rmsm.ai>"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  WEB_APP_URL: z.string().default("http://localhost:3000"),

  // --- Module 004: Billing / Payment Providers ---
  // Every provider's credentials are optional — PaymentProviderRegistry
  // treats a provider as disabled if its required keys are absent, same
  // pattern as Module 002's OAuth provider config.
  MOCK_WEBHOOK_SECRET: z.string().default("mock-webhook-secret-dev-only"),

  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_API_BASE: z.string().default("https://api.stripe.com/v1"),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_API_BASE: z.string().default("https://api.razorpay.com/v1"),

  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_WEBHOOK_ID: z.string().optional(),
  PAYPAL_API_BASE: z.string().default("https://api-m.sandbox.paypal.com"),

  // --- Module 005: Notifications ---
  NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: z.string().min(32).default("1".repeat(64)),

  // --- Module 005 Phase 5: OpenTelemetry ---
  // Read directly via process.env in tracing.ts, NOT via loadConfig() —
  // tracing.ts must execute before any other import (including this
  // config package), so it can't depend on loadConfig() having run yet.
  // Declared here anyway for documentation/discoverability alongside
  // every other configurable value, even though this specific pair is
  // never actually read through this schema at runtime.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;
