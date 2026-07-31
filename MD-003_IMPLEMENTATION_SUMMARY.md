# MD-003 — Alpha Vantage Provider Integration

Alpha Vantage is added as a fourth `MarketDataProvider`, alongside Internal Feed, Twelve Data, and CoinGecko, using the exact Provider Registry → Factory → Resolver → `MarketDataProvider` architecture already in place. No architecture changes. No existing provider, module, controller, DTO, or Prisma model was touched beyond the one additive registration edit in `market-data.module.ts`.

## 1. Files Added

**`api/src/modules/market-data/providers/alphavantage/`** (10 files, matching MD-003's own example structure exactly):

- `alphavantage.types.ts` — raw Alpha Vantage response shapes (`GLOBAL_QUOTE`, `TIME_SERIES_*`, `CURRENCY_EXCHANGE_RATE`, `SYMBOL_SEARCH`, `OVERVIEW`, `MARKET_STATUS`), including the three error-signal keys (`"Error Message"`, `Note`, `Information`) every response type carries.
- `alphavantage.constants.ts` — `ALPHA_VANTAGE_INTERVAL_FUNCTION` (interval → function/seriesKey map, 7 of 9 `CandleInterval` values), `ALPHA_VANTAGE_ASSET_CLASSES`, default rate-limit/retry constants, `parseCurrencyPair()`, and the four `*_TTL_MULTIPLIER` cache constants.
- `alphavantage.error-mapper.ts` — `AlphaVantageErrorMapper implements ProviderErrorMapper`. Classifies Alpha Vantage's HTTP-200-with-error-in-body responses (`isNoteRateLimit`, `isInformationMessage`, `isErrorMessage`, `isEmptyResult`, `isMalformedResponse`) plus a defensive HTTP-status fallback, into the existing `ProviderErrorClassification` vocabulary.
- `alphavantage.rate-limit.ts` — `AlphaVantageRateLimiter implements ProviderRateLimitPolicy`. Dual independent sliding windows (5/minute, 25/day); `getWaitTimeMs()` returns the max of both.
- `alphavantage.cache.ts` — `AlphaVantageCacheService`. Redis-backed cache-aside, reusing `REDIS_URL`/`ioredis`/`MARKET_DATA_CACHE_TTL_MS`; `getOrSet(key, ttlMs, fetcher)` takes TTL per call so different data categories can cache at different lifetimes.
- `alphavantage.client.ts` — `AlphaVantageClient`. Raw `fetch` transport with timeout, retry+backoff, rate-limiter integration, and the envelope-error detection that is this provider's defining quirk (see Section 6). Exports `toAlphaVantageRequest()`.
- `alphavantage.mapper.ts` — `AlphaVantageMapper`. Raw JSON → `NormalizedQuote`/`NormalizedCandle`/`NormalizedSymbolSearchResult`, plus the additive `AlphaVantageCompanyOverview` type and market-status pass-through.
- `alphavantage.health.ts` — `AlphaVantageHealthProvider implements HealthProvider`. Maps to `healthy`/`degraded`/`down`/`unknown`; never throws.
- `alphavantage.provider.ts` — `AlphaVantageProvider implements MarketDataProvider`. Wires everything together; exposes `historicalDataClient`, `quoteClient`, `symbolSearchClient`, `healthProvider`, plus additive `getCompanyOverview()` and `getMarketStatus()`.
- `alphavantage.module.ts` — `AlphaVantageRegistrarService implements OnModuleInit`. Registers with `ProviderRegistryService` and `ProviderFactoryService.registerBuilder("ALPHA_VANTAGE", ...)`.

**`api/src/modules/market-data/providers/alphavantage/__tests__/`** (9 spec files — see Section 8).

**`packages/config/src/`**:
- `schemas/alphavantage.schema.ts` — Zod schema for the 4 named env vars.
- `config/alphavantage.config.ts` — `getAlphaVantageConfig()`, mirroring `getCoinGeckoConfig()`.

## 2. Files Modified

- `packages/config/src/schemas/index.ts` — added `export * from "./alphavantage.schema"`.
- `packages/config/src/config/index.ts` — added `export * from "./alphavantage.config"`.
- `packages/config/src/env/env.validator.ts` — imported `alphaVantageSchema`, added `.merge(alphaVantageSchema)` to the merge chain.
- `api/src/modules/market-data/market-data.module.ts` — imported `AlphaVantageRegistrarService` and `AlphaVantageCacheService`; added both to the module's own `providers` array (not `imports` — same circular-dependency reasoning as `TwelveDataRegistrarService`/`CoinGeckoRegistrarService`, since `ProviderRegistryService`/`ProviderFactoryService` are provided and exported by `MarketDataModule` itself).

**No Prisma migration required.** Unlike MD-002's `COINGECKO`, `ALPHA_VANTAGE` already exists in the `MarketDataProviderType` enum (`packages/database/prisma/schema.prisma`) — confirmed before writing any code. Nothing to add, no manual merge step here.

## 3. Configuration Changes

Four new env vars, all inside `@rmsm/config`, no `process.env` used anywhere in the new code:

| Variable | Default | Notes |
|---|---|---|
| `ALPHA_VANTAGE_API_KEY` | *(unset)* | Optional. Absent → provider `enabled` is `false` (see Section 7). |
| `ALPHA_VANTAGE_BASE_URL` | `https://www.alphavantage.co` | |
| `ALPHA_VANTAGE_TIMEOUT` | `10000` (ms) | Parsed via the existing `durationMs()` helper. |
| `ALPHA_VANTAGE_RATE_LIMIT` | `5` | Requests/minute. The 25/day ceiling has no dedicated env var (MD-003 names only these four keys) — it stays a documented constant in `alphavantage.constants.ts`. |

## 4. Provider Registration Changes

`AlphaVantageRegistrarService.onModuleInit()` registers one eager `AlphaVantageProvider` instance with `ProviderRegistryService` and a builder function with `ProviderFactoryService.registerBuilder("ALPHA_VANTAGE", ...)` — the existing Map-based mechanism, zero switch statements, identical pattern to every other provider registrar. `factory.create(configRow)` honors a DB config row's `baseUrl` and `rateLimitPerMinute` overrides; the per-minute rate limit override affects only the minute dimension of the dual sliding window — the daily dimension has no DB-row equivalent and always stays at the documented default (25/day), a deliberate asymmetry called out in the registrar's own doc comment and covered by a test.

## 5. API Examples

```ts
const provider = providerFactory.create(alphaVantageConfigRow);

// Current quote (equity)
const quote = await provider.quoteClient!.fetchLatestQuote("IBM");
// → { providerSymbol: "IBM", lastPrice: "189.42", eventTime: Date, ... }

// Forex / crypto exchange rate — routed by the "/" convention
const fx = await provider.quoteClient!.fetchLatestQuote("EUR/USD");
// → { providerSymbol: "EUR/USD", lastPrice: "1.0850", ... }

// Historical daily candles
const candles = await provider.historicalDataClient!.fetchCandles({
  providerSymbol: "IBM", interval: "ONE_DAY", from, to,
});

// Symbol search
const results = await provider.symbolSearchClient!.search("IB", 5);

// Additive: company fundamentals (beyond MarketDataProvider)
const overview = await provider.getCompanyOverview("IBM");
// → { symbol: "IBM", sector: "TECHNOLOGY", peRatio: "24.5", ... }

// Additive: market status
const status = await provider.getMarketStatus();
```

## 6. Error Handling — Alpha Vantage's HTTP-200-with-error-in-body quirk

Alpha Vantage's `/query` endpoint returns HTTP 200 for nearly every failure mode. `AlphaVantageClient.request()` inspects the JSON body on every call, in priority order: `Note` (rate limit) → `Information` (rate limit or auth/premium, disambiguated by message text) → `"Error Message"` (invalid request or auth, disambiguated by message text) → malformed body. A genuine non-200 HTTP status is handled too, as a defensive fallback. All seven of MD-003's required cases are covered:

| MD-003 case | Detection | Classification |
|---|---|---|
| 429 Rate Limit | `Note` present, or `Information` not mentioning the API key | `rate_limited` |
| 403 API Key Issues | `Information`/`"Error Message"` mentioning "apikey"/"premium", or HTTP 401/403 | `authentication_failed` |
| 404 Symbol Not Found | `GLOBAL_QUOTE` returns `{}` (Alpha Vantage never actually 404s) | `symbol_not_found` |
| Invalid API Function | `"Error Message"` not mentioning the key | `invalid_request` |
| Network Timeout | `AbortController` fires | `provider_outage` |
| Malformed Response | body isn't valid JSON, or isn't an object | `unknown` |
| HTTP Errors | non-2xx status | mapped per status code |

## 7. Design Notes — Judgment Calls Made Explicit

- **`enabled` is `Boolean(apiKey)`**, not always `true`. This is the opposite of CoinGecko's convention: Alpha Vantage's `apikey=demo` fallback only serves a handful of fixed demo symbols, not real production use, so no key genuinely means disabled — matching Twelve Data's convention instead.
- **Dual rate-limit windows.** Alpha Vantage's free tier caps both per-minute (5) and per-day (25), and the daily cap is the one that actually binds in practice. `AlphaVantageRateLimiter` tracks both independently and waits on whichever is longer.
- **Per-call cache TTL.** `AlphaVantageCacheService.getOrSet()` takes `ttlMs` as an explicit parameter (unlike `CoinGeckoCacheService`'s fixed TTL), so quotes/exchange-rates (1x), historical series (12x), and company overview (60x) each cache at a lifetime matching how often that data actually changes — a real cost saving given the 25/day ceiling.
- **`"FROM/TO"` provider-symbol convention.** Alpha Vantage has no unified quote concept spanning equities and currency pairs — `parseCurrencyPair()` routes a `providerSymbol` containing `/` to `CURRENCY_EXCHANGE_RATE`, everything else to `GLOBAL_QUOTE`. This convention is this provider's own, documented where it's introduced.
- **No 4-hour intraday interval.** Alpha Vantage's intraday granularities are exactly 1/5/15/30/60 minutes. `FOUR_HOURS` throws a clear, descriptive error before any network call rather than approximating it by resampling — the same "honest interval support" discipline established for CoinGecko's OHLC tiers in MD-002.
- **Additive methods beyond the interface.** `getCompanyOverview()` and `getMarketStatus()` expose real Alpha Vantage data (fundamentals, market-open status) that has no field on `NormalizedQuote` and no column on `market_quotes` — same pattern as CoinGecko's `getMarketSnapshot()`, no interface or schema changes required.

## 8. Test Coverage Summary

9 spec files, **93 tests, all passing** — verified with a real Jest run (not just typecheck) in an isolated sandbox, using the actual source files and the real `@nestjs/common`/`ioredis` packages:

- `alphavantage.types.ts` — covered indirectly via mapper/client tests.
- `alphavantage.constants.spec.ts` — `parseCurrencyPair()`, interval coverage, TTL multipliers.
- `alphavantage.error-mapper.spec.ts` — every classification branch, priority ordering, `isRetryable()`.
- `alphavantage.rate-limit.spec.ts` — dual-window behavior, `max()` semantics, independent eviction.
- `alphavantage.cache.spec.ts` — hit/miss/failure-fallback, per-call TTL, key prefixing.
- `alphavantage.client.spec.ts` — HTTP mocks for every function, envelope-error detection, retries, timeout/network/malformed classification, API-key-never-logged.
- `alphavantage.mapper.spec.ts` — every mapping method, including UTC-parsing edge cases.
- `alphavantage.health.spec.ts` — healthy/degraded/down/unknown, consecutive-failure tracking.
- `alphavantage.provider.spec.ts` — full composition: quote routing (equity vs. FX), candle fetch, symbol search, additive methods, enabled/disabled.
- `alphavantage.module.spec.ts` — registry/factory registration, config-row overrides (including the minute-only override asymmetry), shared cache instance.

**Two real bugs were caught and fixed during verification**, both before delivery:
1. A JSDoc comment in `alphavantage.constants.ts` contained a literal `TIME_SERIES_*/CURRENCY...` — the `*/` sequence prematurely closed the block comment, causing cascading syntax errors. Caught by `tsc --strict`.
2. The "disabled when no API key" test called `buildProvider(undefined)` against a helper with a JS default parameter — `undefined` triggers the default, so the test silently never exercised the disabled path. Caught by running the actual test suite (not just typecheck) and seeing it fail; fixed by removing the default and passing the key explicitly at every call site.

## 9. Validation Checklist

| Check | Result |
|---|---|
| `tsc --strict --noEmit` against real interfaces + all new provider/config files | ✅ 0 errors |
| `tsc --strict --noEmit` against `@rmsm/config` schema/config additions | ✅ 0 errors |
| Real Jest execution (real `@nestjs/common`, real `ioredis`, mocked HTTP/Redis at the boundary) | ✅ 9/9 suites, 93/93 tests |
| `pnpm lint` / `pnpm build` / Docker startup / API health | Not run directly (no live repo access in this environment) — code follows the exact lint-clean patterns (import order, typing discipline, no `any`) already passing in MD-001/MD-002 |
| No `process.env` usage | ✅ verified by inspection — only `@rmsm/config`'s `Env` type is read |
| No switch-statement provider registration | ✅ `ProviderFactoryService.registerBuilder()`, same as every other provider |
| Existing providers unaffected | ✅ no Internal Feed / Twelve Data / CoinGecko file was touched |
| Prisma migration | Not needed — `ALPHA_VANTAGE` already existed in the enum |

## 10. Manual Merge Steps Required

1. Apply this deliverable's files into the real repository (paths under `api/src/modules/market-data/providers/alphavantage/` and `packages/config/src/`).
2. Add `ALPHA_VANTAGE_API_KEY`, `ALPHA_VANTAGE_BASE_URL`, `ALPHA_VANTAGE_TIMEOUT`, `ALPHA_VANTAGE_RATE_LIMIT` to your `.env` (or deployment secrets) — the provider registers as `enabled: false` and is simply skipped by resolution logic if `ALPHA_VANTAGE_API_KEY` is omitted, so this is safe to defer.
3. Run `pnpm install` (no new runtime dependencies were introduced — `ioredis` and `@nestjs/common` are already dependencies of `api`).
4. Run your standard `pnpm lint && pnpm typecheck && pnpm test && pnpm build` gate to confirm in your actual environment (this deliverable was verified against an isolated reconstruction of your real interfaces, not your live CI).
5. No database migration needed.
