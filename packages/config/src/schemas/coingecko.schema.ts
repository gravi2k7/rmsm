import { z } from "zod";

/**
 * MD-002 CoinGecko provider settings. MD-002's own Configuration section
 * names exactly these two variables — unlike Twelve Data (MD-001), it
 * does not ask for timeout/retry/backoff to be environment-configurable,
 * so those stay as documented constants in `coingecko.constants.ts`
 * rather than growing this schema beyond what was actually requested.
 */
export const coinGeckoSchema = z.object({
  /** Optional — CoinGecko's public "Demo" API tier works without a key
   * (rate-limited lower); a provided key is sent as the `x-cg-demo-api-key`
   * header, never a query param, so it can never end up in a logged URL. */
  COINGECKO_API_KEY: z.string().optional(),
  COINGECKO_BASE_URL: z.string().default("https://api.coingecko.com/api/v3"),
});

export type CoinGeckoEnv = z.infer<typeof coinGeckoSchema>;
