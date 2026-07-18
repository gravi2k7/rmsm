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

  FEATURE_FLAGS: commaSeparatedList(),
});

export type AppEnv = z.infer<typeof appSchema>;
