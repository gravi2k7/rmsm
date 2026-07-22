import type { Env } from "@rmsm/config";

/**
 * Resolves the CORS `origin` option from validated config (SEC-001 fix,
 * BVP-003R). Extracted as a small, pure, independently-testable function
 * rather than left as inline logic in main.ts's bootstrap(), specifically
 * so "verify startup behavior for development and production
 * configurations" (BVP-003R's own requirement) can be a real, executed
 * unit test rather than something only checkable by actually booting the
 * app end-to-end.
 *
 * - `local`: fully permissive (`true`) — unchanged from before this fix,
 *   no behavior change for local development.
 * - staging/production, `CORS_ALLOWED_ORIGINS` set: exactly that
 *   explicit allowlist (already validated to reject a wildcard by
 *   env.validator.ts's production/staging guard).
 * - staging/production, `CORS_ALLOWED_ORIGINS` unset/empty: falls back
 *   to `[WEB_APP_URL]` — already required and validated non-localhost in
 *   these environments — so the API is never unreachable from its own
 *   frontend by default. This was the actual SEC-001 bug: the previous
 *   code returned a literal empty array here, rejecting every
 *   cross-origin request unconditionally.
 */
export function resolveCorsOrigins(config: Pick<Env, "APP_ENV" | "CORS_ALLOWED_ORIGINS" | "WEB_APP_URL">): true | string[] {
  if (config.APP_ENV === "local") return true;
  if (config.CORS_ALLOWED_ORIGINS.length > 0) return config.CORS_ALLOWED_ORIGINS;
  return [config.WEB_APP_URL];
}
