import { z } from "zod";
import { commaSeparatedList, durationMs, port } from "../env/env.parser";

/**
 * Top-level application settings: which environment this is, which ports
 * to listen on, global rate limiting, the public web app URL, and feature
 * flags. `NODE_ENV`/`API_PORT`/`WEB_PORT`/`ADMIN_PORT`/`RATE_LIMIT_*`/
 * `WEB_APP_URL` are unchanged from the original flat `envSchema`.
 *
 * `FEATURE_FLAGS` is new: a comma-separated list of enabled flag names
 * (e.g. `FEATURE_FLAGS=new-dashboard,beta-search`), read via
 * `utils/config.helper.ts`'s `isFeatureEnabled()`. This is additive — no
 * existing consumer reads this field, so its absence in an existing
 * deployment's env is fine (defaults to no flags enabled).
 */
export const appSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  APP_ENV: z.enum(["local", "development", "staging", "production"]).default("local"),

  API_PORT: port(3001),
  WEB_PORT: port(3000),
  ADMIN_PORT: port(3002),

  RATE_LIMIT_TTL_MS: durationMs(60000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),

  WEB_APP_URL: z.string().default("http://localhost:3000"),

  // Explicit, operator-controlled CORS allowlist for staging/production —
  // comma-separated (e.g. "https://app.rmsm.com,https://admin.rmsm.com").
  // Optional: unlike COOKIE_SECRET/TWO_FACTOR_ENCRYPTION_KEY/etc. (see
  // env.validator.ts's production/staging guard), there's no
  // "insecure guessable default" risk here to fail-fast against — an
  // empty/missing value is a functional-restrictiveness problem (the API
  // would reject its own frontends), not a security one, so main.ts
  // falls back to `[WEB_APP_URL]` (already required and validated
  // non-localhost in production) rather than failing startup outright.
  // A literal "*" is rejected in staging/production by the same guard
  // that validates the other production-only fields (see
  // env.validator.ts) — wildcard origins are never safe to accept
  // outside local development, especially combined with
  // `credentials: true` (see main.ts's enableCors call).
  CORS_ALLOWED_ORIGINS: commaSeparatedList(),

  FEATURE_FLAGS: commaSeparatedList(),
});

export type AppEnv = z.infer<typeof appSchema>;
