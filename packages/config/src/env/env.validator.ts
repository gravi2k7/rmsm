import { z } from "zod";
import { appSchema } from "../schemas/app.schema";
import { databaseSchema } from "../schemas/database.schema";
import { authSchema } from "../schemas/auth.schema";
import { loggingSchema } from "../schemas/logging.schema";
import { aiSchema } from "../schemas/ai.schema";
import { marketSchema } from "../schemas/market.schema";
import { booleanFromString, durationMs } from "./env.parser";
import { ConfigValidationError } from "../types/config.types";

/**
 * Env vars that predate this package's six-domain restructuring and don't
 * map cleanly onto any of them (billing provider credentials, the
 * notifications encryption key, the AI-103 strategy-engine outbox
 * publisher's own settings). Kept together here — rather than force-fit
 * into e.g. `app.schema.ts`, which would misrepresent them as
 * general-purpose application settings — and merged into the root schema
 * below so nothing is silently dropped. A future task that adds
 * dedicated `billing`/`notifications`/`strategy-engine` config domains
 * (following this exact same pattern) is the natural place to retire this
 * grouping; until then, this preserves full backward compatibility with
 * every field the original flat `envSchema` validated.
 */
const platformIntegrationsSchema = z.object({
  // Module 004: Billing / Payment Providers — every provider's credentials
  // are optional; a provider is treated as disabled if its required keys
  // are absent (the same pattern Module 002's OAuth provider config uses).
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

  // Module 005: Notifications
  NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY: z.string().min(32).default("1".repeat(64)),

  // AI-103 Milestone 4: Strategy Engine outbox publisher — centralized,
  // validated config so the outbox publisher itself hardcodes nothing.
  STRATEGY_OUTBOX_PUBLISHER_ENABLED: booleanFromString(true),
  STRATEGY_OUTBOX_POLL_INTERVAL_MS: durationMs(5000),
  STRATEGY_OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  STRATEGY_OUTBOX_MAX_RETRIES: z.coerce.number().int().positive().default(5),
});

/**
 * The complete environment schema — every domain schema merged into one
 * flat shape. Flat, not nested, so `Env` (the inferred type) stays
 * byte-for-byte compatible with every existing `config.SOME_FIELD` access
 * across the codebase; see `config/*.config.ts` for the *new*, nested,
 * domain-scoped view built on top of this same validated data.
 */
const mergedEnvSchema = appSchema
  .merge(databaseSchema)
  .merge(authSchema)
  .merge(loggingSchema)
  .merge(aiSchema)
  .merge(marketSchema)
  .merge(platformIntegrationsSchema);

/**
 * Every (field, insecure default) pair that exists purely so local
 * development works with zero setup. None of these should ever reach a
 * staging or production deployment still holding this value — each is a
 * secret an attacker could trivially guess from this very file (it's
 * public, checked into source control) if a deployment forgot to
 * override it. This is deliberately a short, explicit, hand-maintained
 * list rather than a heuristic ("looks like a default") — a hand-picked
 * set of exact known values has no false-positive risk against a real
 * operator-chosen secret that merely happens to look similar.
 */
const INSECURE_PRODUCTION_DEFAULTS: readonly { field: keyof z.infer<typeof mergedEnvSchema>; value: string; hint: string }[] = [
  { field: "COOKIE_SECRET", value: "dev-cookie-secret-change-me!!", hint: "Generate a real secret (e.g. `openssl rand -base64 32`)." },
  { field: "TWO_FACTOR_ENCRYPTION_KEY", value: "0".repeat(64), hint: "Generate a real 32-byte hex key (e.g. `openssl rand -hex 32`)." },
  {
    field: "NOTIFICATION_CREDENTIALS_ENCRYPTION_KEY",
    value: "1".repeat(64),
    hint: "Generate a real 32-byte hex key (e.g. `openssl rand -hex 32`).",
  },
  { field: "MOCK_WEBHOOK_SECRET", value: "mock-webhook-secret-dev-only", hint: "The mock payment provider is for local dev only — set a real value or leave the provider disabled." },
];

/**
 * A deployment left pointing at `localhost` isn't a leaked-secret risk
 * the way the fields above are, but it's an equally real staging/
 * production footgun this same fail-fast pass catches: Stripe checkout
 * redirects, password-reset links, and (once CORS allowlisting lands)
 * the browser origin allowlist all derive from `WEB_APP_URL`.
 */
const LOCALHOST_URL_DEFAULTS: readonly { field: keyof z.infer<typeof mergedEnvSchema>; prefix: string }[] = [
  { field: "WEB_APP_URL", prefix: "http://localhost" },
];

const NON_DEVELOPMENT_ENVIRONMENTS = new Set(["staging", "production"]);

/**
 * Applied to the merged schema below. `superRefine` (rather than per-field
 * `.refine()`) so this can see `NODE_ENV` alongside every other field at
 * once, and so a single failing config reports *every* insecure field in
 * one pass — matching this package's existing "list every issue, not just
 * the first" fail-fast philosophy (see `validateEnv`'s own doc comment).
 */
export const envSchema = mergedEnvSchema.superRefine((data, ctx) => {
  if (!NON_DEVELOPMENT_ENVIRONMENTS.has(data.NODE_ENV)) return;

  for (const { field, value, hint } of INSECURE_PRODUCTION_DEFAULTS) {
    if (data[field] === value) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `must be set to a real value in ${data.NODE_ENV} — the development default is not allowed here. ${hint}`,
      });
    }
  }

  for (const { field, prefix } of LOCALHOST_URL_DEFAULTS) {
    const fieldValue = data[field];
    if (typeof fieldValue === "string" && fieldValue.startsWith(prefix)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [field],
        message: `must point to a real ${data.NODE_ENV} URL, not "${fieldValue}" — a localhost value here reaches actual users (checkout redirects, password-reset links) in this environment.`,
      });
    }
  }

  // A literal "*" in CORS_ALLOWED_ORIGINS is never safe outside local
  // development — doubly so here, since `enableCors` is called with
  // `credentials: true` (see main.ts), and browsers themselves reject a
  // wildcard origin combined with credentials; failing fast server-side
  // makes the misconfiguration obvious at startup rather than as a
  // confusing browser-side CORS failure discovered later.
  if (data.CORS_ALLOWED_ORIGINS.includes("*")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ALLOWED_ORIGINS"],
      message: `must not include a wildcard ("*") in ${data.NODE_ENV} — list explicit origins instead (e.g. "https://app.example.com,https://admin.example.com").`,
    });
  }
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates a raw environment object (normally `process.env`) against
 * {@link envSchema}. Fails fast: throws a {@link ConfigValidationError}
 * with every issue pre-formatted as `path: message`, rather than letting
 * an app boot with missing/invalid configuration and fail confusingly
 * later at first use.
 */
export function validateEnv(raw: Record<string, string | undefined>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new ConfigValidationError(`Invalid environment configuration:\n${issues.map((i) => `  - ${i}`).join("\n")}`, issues);
  }
  return parsed.data;
}
