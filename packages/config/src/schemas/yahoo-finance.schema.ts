import { z } from "zod";
import { booleanFromString, durationMs } from "../env/env.parser";

/**
 * MD-004 Yahoo Finance provider settings. MD-004's own Configuration
 * section names exactly these four variables. Unlike every other
 * provider in this module, Yahoo Finance has no API key — there is no
 * official API to issue one — so `YAHOO_ENABLED` (not credential
 * presence) is what gates `YahooFinanceProvider.enabled`, an explicit
 * opt-in acknowledging that this provider relies on an unofficial,
 * no-SLA surface Yahoo can change or block without notice.
 */
export const yahooFinanceSchema = z.object({
  YAHOO_ENABLED: booleanFromString(true),
  /** Seconds, per MD-004's own example (`YAHOO_CACHE_TTL=300`) — unlike `MARKET_DATA_CACHE_TTL_MS`, this provider's base cache TTL is its own dedicated var and is NOT in milliseconds; `YahooFinanceRegistrarService` converts to ms before handing it to `YahooFinanceProvider`. */
  YAHOO_CACHE_TTL: z.coerce.number().int().positive().default(300),
  YAHOO_TIMEOUT: durationMs(10_000),
  YAHOO_RETRY_COUNT: z.coerce.number().int().min(0).default(3),
});

export type YahooFinanceEnv = z.infer<typeof yahooFinanceSchema>;
