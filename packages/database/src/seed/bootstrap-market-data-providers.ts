/**
 * Bootstrap Market Data Provider Configurations.
 *
 * FIP-001 shipped the `market_data_provider_configs` table and every
 * endpoint that reads/writes it (`ProviderConfigController` and friends),
 * but nothing ever inserted a row — providers are meant to be
 * provisioned once, out-of-band, the same way `bootstrap-admin.ts`
 * provisions the first user. A fresh (or freshly-migrated) database
 * therefore has the table but zero rows, and the Admin UI's Providers
 * page has nothing to show ("No providers configured") even though the
 * backend is otherwise fully wired up.
 *
 * This module is that missing provisioning step for the four providers
 * this platform already ships real integrations for (`api/src/modules/
 * market-data/providers/{twelve-data,alphavantage,coingecko,
 * yahoo-finance}`) — it does not add a fifth (BINANCE / POLYGON /
 * TRADINGVIEW_BRIDGE remain unseeded; there's no provider integration
 * behind them yet, so a row for them would just be a broken entry the
 * Admin UI could try to test-connect against with nothing on the other
 * end).
 *
 * Idempotency: `MarketDataProviderConfig.type` has no unique constraint
 * in the schema (only a composite, non-unique `@@index([type,
 * isActive])` — see schema.prisma's own model comment), and this task
 * explicitly forbids adding one. So idempotency can't be a per-row
 * upsert-by-type; it's a table-level gate instead, exactly matching the
 * prompt's own framing ("if the table is empty ... if records already
 * exist, do nothing"): `count() === 0` decides whether to seed at all,
 * and either all four rows are created or none are.
 *
 * This same function is called from two places (both idempotent, both
 * safe to run any number of times, in any order, together or alone):
 *  1. `prisma/seed.ts` — the existing manual/CI seed entrypoint.
 *  2. `MarketDataProviderBootstrapService` (`apps/api`, `OnModuleInit`) —
 *     so the providers also appear after a plain `docker compose up`
 *     even on a deployment that never runs the separate seed script,
 *     which is the literal root cause of the reported bug (`api/
 *     Dockerfile`'s production CMD runs `migrate:deploy` but never
 *     chains `pnpm seed`).
 *
 * Because trigger #2 runs from `OnModuleInit` — i.e. once per API
 * process, not once per deployment — a multi-replica rollout can have
 * every replica race this at boot against the same still-empty table.
 * The outer `count()` check alone can't close that window (classic
 * check-then-act TOCTOU), so the actual write additionally runs inside
 * a `Serializable`-isolation transaction that re-checks the count. Under
 * `Serializable`, Postgres aborts every loser of a genuine write race
 * with a serialization-failure error (SQLSTATE 40001 / Prisma's
 * `P2034`) instead of letting more than one replica insert — treated
 * below as "another process already seeded this," not a real failure.
 */
import { Prisma, type PrismaClient } from "@prisma/client";

export interface DefaultMarketDataProviderConfig {
  type: "TWELVE_DATA" | "ALPHA_VANTAGE" | "COINGECKO" | "YAHOO_FINANCE";
  name: string;
  baseUrl: string;
  rateLimitPerMinute: number;
  supportedAssetClasses: Prisma.MarketDataProviderConfigCreateInput["supportedAssetClasses"];
  /** Resolution-order tiebreak (`priority`, lower wins — see the field's own schema comment). Ordered here by how broad/reliable each free-tier integration is: Twelve Data covers the most asset classes with the friendliest rate limit, Alpha Vantage next, then CoinGecko (crypto-only but generous), then Yahoo Finance (unofficial API, no key, used last). Distinct values rather than the schema's generic default of 100 for all four, so the Admin UI's priority ordering and ProviderFailoverService's failover order are meaningful out of the box instead of a four-way tie. */
  priority: number;
}

/**
 * Base URLs, rate limits, and supported asset classes mirror each
 * provider's own existing constants/config-schema defaults exactly
 * (`api/src/modules/market-data/providers/**`; `@rmsm/config`'s
 * `*.schema.ts` env defaults) — this seed does not invent new defaults,
 * it repeats the ones the provider integrations already run with.
 * `credentialReference` is intentionally omitted (left `null`): this
 * column names a secret in an external secrets manager, and this seed
 * has no such secret to reference — the prompt's own "allow
 * configuration of credentials" for the Admin UI is exactly the
 * follow-up action an operator takes after these rows exist.
 */
export const DEFAULT_MARKET_DATA_PROVIDERS: DefaultMarketDataProviderConfig[] = [
  {
    type: "TWELVE_DATA",
    name: "Twelve Data",
    baseUrl: "https://api.twelvedata.com",
    rateLimitPerMinute: 8,
    supportedAssetClasses: ["EQUITY", "ETF", "CRYPTO", "FOREX", "COMMODITY", "INDEX", "BOND", "OPTION", "FUTURE"],
    priority: 10,
  },
  {
    type: "ALPHA_VANTAGE",
    name: "Alpha Vantage",
    baseUrl: "https://www.alphavantage.co",
    rateLimitPerMinute: 5,
    supportedAssetClasses: ["EQUITY", "ETF", "FOREX", "CRYPTO"],
    priority: 20,
  },
  {
    type: "COINGECKO",
    name: "CoinGecko",
    baseUrl: "https://api.coingecko.com/api/v3",
    rateLimitPerMinute: 30,
    supportedAssetClasses: ["CRYPTO"],
    priority: 30,
  },
  {
    type: "YAHOO_FINANCE",
    name: "Yahoo Finance",
    baseUrl: "https://query1.finance.yahoo.com",
    rateLimitPerMinute: 30,
    supportedAssetClasses: ["EQUITY", "ETF"],
    priority: 40,
  },
];

export type BootstrapMarketDataProvidersOutcome =
  | { status: "already_seeded"; count: number }
  | { status: "seeded"; count: number };

/** Prisma's serialization-failure error code (SQLSTATE 40001) — thrown by one side of a genuine concurrent write race under `Serializable` isolation. */
const SERIALIZATION_FAILURE_CODE = "P2034";

export async function bootstrapMarketDataProviders(prisma: PrismaClient): Promise<BootstrapMarketDataProvidersOutcome> {
  const existingCount = await prisma.marketDataProviderConfig.count();
  if (existingCount > 0) {
    // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
    console.log(`✓ Market data provider configs already seeded (${existingCount} row(s)) — skipping.`);
    return { status: "already_seeded", count: existingCount };
  }

  try {
    await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        // Re-check inside the transaction — closes the TOCTOU window
        // between the count() above and this write (see this file's
        // header comment for why that window is real here).
        const recheck = await tx.marketDataProviderConfig.count();
        if (recheck > 0) return;

        for (const provider of DEFAULT_MARKET_DATA_PROVIDERS) {
          await tx.marketDataProviderConfig.create({
            data: {
              type: provider.type,
              name: provider.name,
              baseUrl: provider.baseUrl,
              rateLimitPerMinute: provider.rateLimitPerMinute,
              supportedAssetClasses: provider.supportedAssetClasses,
              priority: provider.priority,
              isActive: true,
            },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === SERIALIZATION_FAILURE_CODE) {
      // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
      console.log("Market data provider configs are already being seeded by another process — skipping.");
      return { status: "already_seeded", count: DEFAULT_MARKET_DATA_PROVIDERS.length };
    }
    throw error;
  }

  // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
  console.log(`✓ Seeded ${DEFAULT_MARKET_DATA_PROVIDERS.length} default market data provider configuration(s): ${DEFAULT_MARKET_DATA_PROVIDERS.map((p) => p.name).join(", ")}`);
  return { status: "seeded", count: DEFAULT_MARKET_DATA_PROVIDERS.length };
}
