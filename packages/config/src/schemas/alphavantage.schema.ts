import { z } from "zod";
import { durationMs } from "../env/env.parser";

/**
 * MD-003 Alpha Vantage provider settings. MD-003's own Configuration
 * section names exactly these four variables (unlike MD-002's CoinGecko,
 * which named only two) — Alpha Vantage's unusually strict free-tier
 * rate limit (25 requests/day) is why MD-003 asks for the rate limit to
 * be environment-configurable here rather than left as a hardcoded
 * constant the way CoinGecko's per-minute limit is.
 */
export const alphaVantageSchema = z.object({
  /** Optional — matches every other provider's "disabled, not broken"
   * convention when absent. Unlike CoinGecko, Alpha Vantage's `apikey=demo`
   * fallback only serves a fixed set of demo symbols, so `enabled` on
   * `AlphaVantageProvider` is `false` (not merely rate-limited) without it. */
  ALPHA_VANTAGE_API_KEY: z.string().optional(),
  ALPHA_VANTAGE_BASE_URL: z.string().default("https://www.alphavantage.co"),
  ALPHA_VANTAGE_TIMEOUT: durationMs(10_000),
  /** Requests-per-minute ceiling for the dual sliding-window rate limiter
   * (`AlphaVantageRateLimiter`); the per-day ceiling has no dedicated env
   * var since MD-003 names only these four keys — it stays at
   * `ALPHA_VANTAGE_DEFAULT_REQUESTS_PER_DAY` (`alphavantage.constants.ts`). */
  ALPHA_VANTAGE_RATE_LIMIT: z.coerce.number().int().positive().default(5),
});

export type AlphaVantageEnv = z.infer<typeof alphaVantageSchema>;
