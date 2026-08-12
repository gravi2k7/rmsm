import { z } from "zod";
import { durationMs } from "../env/env.parser";

/**
 * MD-001 Twelve Data provider settings — deploy-time operational config
 * (base URL, timeout, retry) plus the provider's own API credential.
 * Kept as its own domain schema rather than folded into
 * `market.schema.ts` (whose own doc comment explicitly scopes it to
 * "operational tuning... per-provider credentials... live in the
 * database, not environment config") or into `env.validator.ts`'s
 * legacy `platformIntegrationsSchema` grouping (explicitly documented as
 * a to-be-retired holding area for schemas that predate this package's
 * six-domain restructuring, not a home for new ones) — this is the
 * first per-provider Market Data credential schema, and it follows the
 * six-domain pattern (`schemas/*.schema.ts` + `config/*.config.ts`)
 * going forward rather than adding to the legacy grouping.
 */
export const twelveDataSchema = z.object({
  /** Optional, matching every other per-provider credential in this
   * package (STRIPE_SECRET_KEY, RAZORPAY_KEY_SECRET, etc.) — absence
   * means the provider registers itself disabled, not a boot-time
   * failure (see TwelveDataProvider.enabled / StripeProvider.enabled
   * for the shared convention). */
  TWELVE_DATA_API_KEY: z.string().optional(),
  TWELVE_DATA_BASE_URL: z.string().default("https://api.twelvedata.com"),
  TWELVE_DATA_TIMEOUT: durationMs(10_000),
  TWELVE_DATA_RETRY_COUNT: z.coerce.number().int().min(0).default(3),
  TWELVE_DATA_RETRY_DELAY: durationMs(500),
});

export type TwelveDataEnv = z.infer<typeof twelveDataSchema>;
