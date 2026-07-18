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
export const envSchema = appSchema
  .merge(databaseSchema)
  .merge(authSchema)
  .merge(loggingSchema)
  .merge(aiSchema)
  .merge(marketSchema)
  .merge(platformIntegrationsSchema);

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
