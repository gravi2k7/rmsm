# MD-002 — CoinGecko Provider Integration — Implementation Summary

## 1. File Tree

```
packages/database/prisma/
└── schema.prisma                                   (MODIFIED — 1 enum value added)

api/src/modules/market-data/
├── market-data.module.ts                            (MODIFIED — 3-line addition)
└── providers/
    └── coingecko/                                    (NEW)
        ├── coingecko.provider.ts                     (NEW)
        ├── coingecko.client.ts                       (NEW)
        ├── coingecko.mapper.ts                        (NEW)
        ├── coingecko.types.ts                          (NEW)
        ├── coingecko.constants.ts                       (NEW)
        ├── coingecko.error-mapper.ts                     (NEW)
        ├── coingecko.rate-limit.ts                        (NEW)
        ├── coingecko.health.ts                              (NEW)
        ├── coingecko.cache.ts                                (NEW — see §5)
        ├── coingecko.module.ts                                (NEW — CoinGeckoRegistrarService)
        └── __tests__/                                          (NEW)
            ├── coingecko.provider.spec.ts
            ├── coingecko.client.spec.ts
            ├── coingecko.mapper.spec.ts
            ├── coingecko.error-mapper.spec.ts
            ├── coingecko.rate-limit.spec.ts
            ├── coingecko.health.spec.ts
            ├── coingecko.cache.spec.ts
            ├── coingecko.constants.spec.ts
            └── coingecko.module.spec.ts

packages/config/src/
├── schemas/
│   ├── coingecko.schema.ts                            (NEW)
│   └── index.ts                                        (MODIFIED — +1 export line)
├── config/
│   ├── coingecko.config.ts                              (NEW)
│   └── index.ts                                          (MODIFIED — +1 export line)
└── env/
    └── env.validator.ts                                    (MODIFIED — import + .merge() line)
```

MD-002 listed `coingecko.provider.ts / .mapper.ts / .types.ts / .constants.ts / .client.ts` as "Example files" (not exhaustive). Three more files were added to actually satisfy the prompt's own explicit requirements: `.error-mapper.ts` (required by "Error Handling"), `.rate-limit.ts` (required by "Rate Limiting" — "implement provider-specific rate limiter... return wait time"), `.health.ts` and `.cache.ts` (required by "Cache — reuse existing Redis caching"). `.module.ts` holds `CoinGeckoRegistrarService`, required by "Provider Registration."

No repository, controller, DTO, or existing provider file was touched. `MarketDataModule`'s `imports`/`controllers`/`exports` are unchanged — only two providers were added to its `providers` array.

## 2. Modified Files (exact changes)

### `packages/database/prisma/schema.prisma`
One enum value added to `MarketDataProviderType`:
```prisma
enum MarketDataProviderType {
  BINANCE
  POLYGON
  TWELVE_DATA
  ALPHA_VANTAGE
  YAHOO_FINANCE
  TRADINGVIEW_BRIDGE
  BROKER_BRIDGE
  INTERNAL_FEED
  COINGECKO   // <-- added
}
```
**This is a required change, not optional** — unlike Twelve Data (MD-001), `COINGECKO` did not already exist in this enum. `MarketDataProviderType` in `@rmsm/database` is generated directly from this enum, and `CoinGeckoProvider.type` is typed as `MarketDataProviderType`, so this code will not typecheck against your generated Prisma client until this migration is applied and the client regenerated. See §6 for exact commands — I do not have database access to run this myself.

### `api/src/modules/market-data/market-data.module.ts`
Three additions, nothing else:
1. `import { CoinGeckoRegistrarService } from "./providers/coingecko/coingecko.module";`
2. `import { CoinGeckoCacheService } from "./providers/coingecko/coingecko.cache";`
3. `CoinGeckoCacheService,` and `CoinGeckoRegistrarService,` added to the `providers` array, directly beside `TwelveDataRegistrarService,`.

### `packages/config/src/env/env.validator.ts`
1. `import { coinGeckoSchema } from "../schemas/coingecko.schema";`
2. `.merge(coinGeckoSchema)` added to the `mergedEnvSchema` chain.

### `packages/config/src/schemas/index.ts` / `packages/config/src/config/index.ts`
One `export * from "./coingecko.schema"` / `export * from "./coingecko.config"` line, following the existing pattern.

## 3. New Files

**Provider (10 files):**

- `coingecko.provider.ts` — implements `MarketDataProvider`. Same capability scope as Twelve Data (`historicalDataClient`/`quoteClient`/`symbolSearchClient`/`healthProvider` only). `enabled` is always `true` — see §5 for why this is correct, not an oversight. Also exposes `getMarketSnapshot()`, an additive method beyond the `MarketDataProvider` interface (see §5).
- `coingecko.client.ts` — raw `fetch` HTTP transport: `getMarkets()` (`/coins/markets`), `getOhlc()` (`/coins/{id}/ohlc`), `search()` (`/search`), `ping()` (`/ping`). Timeout, retry with exponential backoff, rate-limiter integration, structured logging that never logs the API key (sent as the `x-cg-demo-api-key` header, never a query parameter). Also exports `resolveOhlcDays()` — see §5 for the honest interval-support limitation this enforces.
- `coingecko.mapper.ts` — the only file that reads raw CoinGecko JSON. Maps `/coins/markets` → `NormalizedQuote` and the additive `CoinGeckoMarketSnapshot`; `/coins/{id}/ohlc` → `NormalizedCandle`; `/search` → `NormalizedSymbolSearchResult`.
- `coingecko.types.ts` — raw CoinGecko response shapes (`CoinGeckoMarketsEntry`, `CoinGeckoOhlcEntry`, `CoinGeckoSearchResponse`, `CoinGeckoErrorBody`).
- `coingecko.constants.ts` — `COINGECKO_SYMBOL_TO_ID` (MD-002's 7 example tickers → CoinGecko coin ids) + `resolveCoinGeckoId()`, default rate limit (30/min), default timeout/retry constants, `COINGECKO_ASSET_CLASSES` (`["CRYPTO"]`).
- `coingecko.error-mapper.ts` — implements `ProviderErrorMapper`. Maps 401/403 → `authentication_failed`, 404 (and CoinGecko's "no market data for this id" case) → `symbol_not_found`, 429 → `rate_limited`, 400 → `invalid_request`, 500/502/503/504/timeout/network → `provider_outage`.
- `coingecko.rate-limit.ts` — sliding-window `ProviderRateLimitPolicy`, defaulting to CoinGecko's documented public-tier ceiling of ~30 requests/minute.
- `coingecko.health.ts` — `HealthProvider` via the dedicated `/ping` endpoint.
- `coingecko.cache.ts` — `CoinGeckoCacheService`, the Redis-backed cache MD-002's "Cache" section asks for. See §5 for what "reuse existing Redis caching" meant in practice, since no shared cache abstraction exists yet.
- `coingecko.module.ts` — `CoinGeckoRegistrarService`, mirroring `TwelveDataRegistrarService`'s exact role and placement.

**Tests (9 files — Provider / Mapper / Error mapper / Rate limiter / Health provider / Historical candles / Quotes / Symbol search / Factory registration are all covered, plus cache and the symbol-resolution table):**

`coingecko.provider.spec.ts`, `coingecko.client.spec.ts`, `coingecko.mapper.spec.ts`, `coingecko.error-mapper.spec.ts`, `coingecko.rate-limit.spec.ts`, `coingecko.health.spec.ts`, `coingecko.cache.spec.ts` (mocks `ioredis`), `coingecko.constants.spec.ts`, `coingecko.module.spec.ts` (registry/factory registration, config-row `rateLimitPerMinute` override, shared-cache-instance verification).

**Config (`@rmsm/config`, 2 files):** `schemas/coingecko.schema.ts` (`COINGECKO_API_KEY` optional, `COINGECKO_BASE_URL` default `https://api.coingecko.com/api/v3`), `config/coingecko.config.ts` (`getCoinGeckoConfig()`).

## 4. Configuration

| Variable | Default | Notes |
|---|---|---|
| `COINGECKO_API_KEY` | *(none — optional)* | CoinGecko's public "Demo" tier works without one, at a lower rate limit. Sent as the `x-cg-demo-api-key` header. |
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | |

MD-002's Configuration section names only these two variables (unlike Twelve Data's five) — timeout (10s), retry count (3), and retry delay (500ms base, exponential) are documented constants in `coingecko.constants.ts` rather than new env vars, to match what was actually asked for rather than over-extending `@rmsm/config`.

## 5. Design Notes — Judgment Calls Made Explicit

MD-002 is a shorter, less prescriptive prompt than MD-001, and CoinGecko's actual API shape doesn't map onto this system's existing contracts as cleanly as Twelve Data's did. Four decisions are worth flagging directly rather than leaving implicit in code comments alone:

**a) The rich crypto data (market cap, 24h volume/change, high/low, supply) doesn't fit `NormalizedQuote`.** I checked: `NormalizedQuote` and the `market_quotes` Prisma table are both bid/ask/last/size-shaped, with no market-cap/volume/supply columns anywhere. Extending either would be a genuine interface/schema change — out of scope per "DO NOT change existing interfaces" / "DO NOT redesign the existing architecture." Instead, `CoinGeckoProvider.getMarketSnapshot(providerSymbol)` is an **additive** method (not part of `MarketDataProvider` — implementing an interface never forbids extra members) that returns all of it. It's real, tested, callable data — just not yet wired into the generic Services → Repositories pipeline, which only persists `NormalizedQuote`. Surfacing it system-wide would need a deliberate, separate future extension of the persisted model.

**b) No shared Redis cache service exists to "reuse."** I checked `api/src` for one: the only existing Redis usage is `QueueModule`'s internal BullMQ connection (not exposed as a general client) and `HealthController`'s one-shot readiness ping. `CoinGeckoCacheService` reuses what genuinely does exist — the same `REDIS_URL` (`@rmsm/config`), the same `ioredis` client library (already a direct `@rmsm/api` dependency, the same import `HealthController` uses), and the same TTL (`MARKET_DATA_CACHE_TTL_MS`, already defined for Market Data since before this task — no new TTL var was added). It is a small, provider-scoped connector, not a new generic caching framework. Cache-aside: a Redis outage degrades to a cache miss (logged) and falls through to the real API call, never to a thrown error.

**c) `enabled` is always `true`.** Every other provider in this codebase (Twelve Data, Stripe) treats a missing credential as disabled. CoinGecko is different: its public Demo API tier genuinely works with zero API key, just at a lower rate limit. Treating a missing `COINGECKO_API_KEY` as "disabled" would misrepresent a fully-functional (if rate-limited) provider as broken.

**d) `fetchCandles()` only supports two `CandleInterval` values: `THIRTY_MINUTES` and `FOUR_HOURS`.** CoinGecko's `/coins/{id}/ohlc` endpoint auto-selects granularity from a `days` parameter — it does not accept an independent interval choice: `days=1` → 30-minute candles, `days` 2–30 → 4-hour candles, `days` 31+ → 4-day candles. RMSM's `CandleInterval` enum has no "four day" member, so that third tier has no value this provider could honestly label its output with. `resolveOhlcDays()` (in `coingecko.client.ts`) only ever produces the first two tiers; `fetchCandles()` throws a clear, descriptive error for any other requested interval **before** calling the API, rather than silently mislabeling 4-day candles as something finer-grained. This is a real CoinGecko API constraint, not a gap in this implementation.

## 6. Migration Notes — Action Required

Unlike MD-001, this milestone requires a real database migration. I do not have database access, so here are the exact steps:

1. **Apply the schema change** — the exact diff is in §2. The delivered file tree does not include a full copy of `schema.prisma` (it's 2,700+ lines); only the relevant enum excerpt is included, at `packages/database/prisma/MarketDataProviderType-enum-excerpt.txt`, for reference. Add `COINGECKO` to the `MarketDataProviderType` enum in your actual `packages/database/prisma/schema.prisma` at the same location shown there.
2. **Generate a migration:**
   ```
   pnpm --filter @rmsm/database exec prisma migrate dev --name add_coingecko_provider_type
   ```
   (In production, generate this migration in dev/staging first, commit the resulting `migrations/` folder, then `prisma migrate deploy` in production — the same flow your Dockerfile's `migrate:deploy` step already runs on container start, per the earlier Prisma Migration Reset work.)
3. **Regenerate the Prisma client** so `MarketDataProviderType` in `@rmsm/database` includes `"COINGECKO"`:
   ```
   pnpm --filter @rmsm/database generate
   ```
4. Steps 2–3 must happen **before** `pnpm typecheck`/`pnpm build` will pass — `CoinGeckoProvider.type: MarketDataProviderType = "COINGECKO"` will not compile against a stale generated client.

No other migration is required. No existing table gained or lost columns; no existing enum value was removed or renamed.

## 7. Validation Checklist

| Requirement | Status | Evidence |
|---|---|---|
| CoinGecko provider implemented | ✅ | `coingecko.provider.ts` implements `MarketDataProvider` |
| Provider registered automatically | ✅ | `CoinGeckoRegistrarService.onModuleInit()`; `coingecko.module.spec.ts` |
| Current price / historical OHLC / candles working | ✅ | `quoteClient`/`historicalDataClient`; provider + mapper specs |
| Market cap / 24h volume / 24h change / high / low / supply | ✅ (additive) | `getMarketSnapshot()` — see §5a for why it's additive, not on `NormalizedQuote` |
| Symbol search working | ✅ | `symbolSearchClient.search`; provider + mapper specs |
| Cache (reuse existing Redis) | ✅ | `coingecko.cache.ts` — see §5b |
| Rate limiting implemented | ✅ | Sliding window, 30/min default; `coingecko.rate-limit.spec.ts` |
| Error mapping (429/404/timeout/network/invalid symbol) | ✅ | `coingecko.error-mapper.spec.ts` |
| Graceful retries, structured logging, no API key in logs | ✅ | `coingecko.client.spec.ts` |
| Mapping — no raw provider objects exposed | ✅ | `coingecko.mapper.ts` is the sole reader of raw CoinGecko JSON |
| Tests added (unit, mapper, provider, factory registration) | ✅ | 9 spec files, see §3 |
| Typecheck passing | ✅ | See §8 |
| Build / lint / full test run passing | ⚠️ See note | See §8 |

## 8. How This Was Verified (and its limits)

Same method as MD-001, since I still don't have direct access to your running repository or CI: I copied your actual `interfaces/`, `contracts/`, `provider-registry.service.ts`, and `provider-factory.service.ts` from `rmsm-source.zip` alongside every new CoinGecko file into an isolated `tsc --strict --noEmit` project (hand-written `.d.ts` stubs only for package *boundaries* — `@nestjs/common`, `@rmsm/database`, `@rmsm/config`, `@rmsm/shared`, `ioredis` — never your domain code). **Result: zero errors**, across the implementation files, all 9 `__tests__` files (with `@types/jest`), and the two `@rmsm/config` additions. This caught and fixed two real bugs before delivery:
- A doc comment in `coingecko.client.ts` containing a literal `*/` mid-sentence, which prematurely closed the JSDoc block and produced cascading syntax errors in everything after it.
- `coingecko.module.ts` importing `COINGECKO_DEFAULT_REQUESTS_PER_MINUTE` from the wrong file (`coingecko.rate-limit.ts` instead of `coingecko.constants.ts`, where it's actually defined and exported).

**Not verified:** `pnpm install && pnpm build && pnpm lint && jest run` against your actual workspace, and — critically — **the Prisma migration itself**, since I cannot run one. Please run, after completing §6's steps:
```
pnpm install
pnpm --filter @rmsm/config test          # existing suite, no CoinGecko-specific cases added there
pnpm --filter @rmsm/api test -- coingecko
pnpm --filter @rmsm/api build
pnpm lint
pnpm typecheck
```
If `pnpm typecheck` fails with `Type '"COINGECKO"' is not assignable to type 'MarketDataProviderType'` or similar, that means §6 steps 2–3 haven't been run yet — that specific error is expected and resolves once the Prisma client is regenerated, not a bug in this diff.
