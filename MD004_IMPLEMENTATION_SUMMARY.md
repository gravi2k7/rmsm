# MD-004 — Yahoo Finance Provider

Yahoo Finance is added as a fifth `MarketDataProvider`, alongside Internal Feed, Twelve Data, CoinGecko, and Alpha Vantage, using the exact Provider Registry → Factory → Resolver → `MarketDataProvider` architecture already in place. No architecture changes, no interface renames, no changes to Provider Registry or Provider Factory, no other provider touched.

## 1. Architecture

Same file-per-responsibility pattern established since MD-001, all under `api/src/modules/market-data/providers/yahoo-finance/`:

- `yahoo-finance.types.ts` — raw Yahoo response shapes (`/v8/finance/chart`, `/v10/finance/quoteSummary`, `/v1/finance/search`). Deliberately narrow — only fields this provider reads.
- `yahoo-finance.dto.ts` — the output shapes this provider's additive methods return (company profile, dividends, splits, earnings, financial-statement lines, fund metadata, news). Kept distinct from the raw types file per MD-004's own separate "Types"/"DTOs" deliverables, and per MD-004's instruction to never expose raw Yahoo response models outside the provider.
- `yahoo-finance.constants.ts` — interval mapping, asset classes, rate-limit default, quoteSummary module list, and the seven `*_TTL_MULTIPLIER` cache constants.
- `yahoo-finance.error-mapper.ts` — `YahooFinanceErrorMapper implements ProviderErrorMapper`.
- `yahoo-finance.rate-limit.ts` — `YahooFinanceRateLimiter implements ProviderRateLimitPolicy` (single 60s sliding window).
- `yahoo-finance.cache.ts` — `YahooFinanceCacheService` (Redis-backed, per-call configurable TTL).
- `yahoo-finance.client.ts` — `YahooFinanceClient`, raw `fetch` transport, including the crumb/cookie negotiation flow.
- `yahoo-finance.mapper.ts` — `YahooFinanceMapper`, the only place raw Yahoo JSON is read.
- `yahoo-finance.health.ts` — `YahooFinanceHealthProvider implements HealthProvider`.
- `yahoo-finance.provider.ts` — `YahooFinanceProvider implements MarketDataProvider`.
- `yahoo-finance.module.ts` — `YahooFinanceRegistrarService implements OnModuleInit`.

`YahooFinanceRegistrarService` is added directly to `MarketDataModule`'s own `providers` array (not a separately-`imports`-ed child module) — the same circular-dependency reasoning documented on every registrar since `TwelveDataRegistrarService`, since `ProviderRegistryService`/`ProviderFactoryService` are provided and exported by `MarketDataModule` itself.

**No Prisma migration required.** `YAHOO_FINANCE` already existed in `MarketDataProviderType` (`packages/database/prisma/schema.prisma`) before this task — confirmed before writing any code, same check performed for MD-003.

## 2. Features

| MD-004 feature | Implementation |
|---|---|
| Company Profile | `getCompanyProfile()` — `assetProfile`/`price`/`summaryDetail` quoteSummary modules |
| Quotes | `quoteClient.fetchLatestQuote()`/`fetchLatestQuotes()` — chart endpoint's `meta` block. **Explicitly not the primary quote source** (see Section 7) |
| Historical Data (Daily/Weekly/Monthly) | `historicalDataClient.fetchCandles()` — chart endpoint, `period1`/`period2` for exact ranges |
| Dividends | `getDividends()` — chart `events.dividends` (history) + `summaryDetail` (yield, ex-date) |
| Stock Splits | `getSplits()` — chart `events.splits` |
| Earnings | `getEarnings()` — `calendarEvents`/`earnings` quoteSummary modules |
| Financial Statements | `getIncomeStatement()`, `getBalanceSheet()`, `getCashFlowStatement()` |
| ETF Metadata | `getEtfMetadata()` — `fundProfile` module |
| Mutual Fund Metadata | `getMutualFundMetadata()` — delegates to the same `fundProfile` module (see Known Limitations) |
| News Metadata (optional) | `getNews()` — `/v1/finance/search`'s `news` array |
| Symbol Search | `symbolSearchClient.search()` — `/v1/finance/search`'s `quotes` array |

## 3. Configuration

Four env vars, all inside `@rmsm/config`, no `process.env` used anywhere in the new code — exactly MD-004's own named list:

| Variable | Default | Notes |
|---|---|---|
| `YAHOO_ENABLED` | `true` | Gates `YahooFinanceProvider.enabled` directly — see Section 7. |
| `YAHOO_CACHE_TTL` | `300` (seconds) | Base cache TTL, per MD-004's own example value. Converted to ms by the registrar before use. |
| `YAHOO_TIMEOUT` | `10000` (ms) | Per-request timeout. |
| `YAHOO_RETRY_COUNT` | `3` | Retry attempts before giving up. |

## 4. Cache Strategy

Reuses the same Redis-backed cache-aside pattern as `AlphaVantageCacheService` (`REDIS_URL`, `ioredis`, per-call `ttlMs`), with its own dedicated `yahoo:` key prefix. `YAHOO_CACHE_TTL` (seconds) is the base; each of MD-004's seven required cache categories multiplies it:

| Category | Multiplier | Rationale |
|---|---|---|
| Quote | 1x | Freshest — though this provider is not the primary quote source |
| Historical Data | 4x | Closed-day bars don't change, but not as long-lived as fundamentals |
| Dividends | 12x | Changes quarterly at most |
| Splits | 24x | Very rare event |
| Earnings | 4x | Updated periodically around earnings season |
| Company Profile / Financial Statements / quoteSummary blob | 24x | Combined into one shared cache entry (see below) |
| ETF/Mutual Fund Metadata | via the shared quoteSummary entry | |
| News | 1x | Time-sensitive by nature |

**Design note:** `/v10/finance/quoteSummary` is requested as ONE combined payload (all modules in a single call — see `YAHOO_QUOTE_SUMMARY_MODULES`) and shared by `getCompanyProfile()`, `getEarnings()`, the three financial-statement methods, `getEtfMetadata()`/`getMutualFundMetadata()`, and half of `getDividends()`. Rather than cache that one raw response under the same key at several different TTLs depending on which caller happens to populate it first, it's cached once at a single shared multiplier (the longest of its constituents) — this also minimizes calls to Yahoo's most fragile, crumb-gated endpoint.

## 5. Error Handling

`YahooFinanceErrorMapper` maps exactly MD-004's six named categories, plus a defensive HTTP-status fallback, into the existing `ProviderErrorClassification` vocabulary:

| MD-004 category | Detection | Classification |
|---|---|---|
| Network Error | `fetch` itself rejects | `provider_outage` |
| Timeout | `AbortController` fires | `provider_outage` |
| Invalid Symbol | `chart.error` / `quoteSummary.error` present on an otherwise-200 response | `symbol_not_found` |
| Parsing Error | body isn't valid JSON | `unknown` |
| Provider Unavailable | 5xx, or the crumb/cookie negotiation itself fails | `provider_outage` |
| Unexpected Response | body parsed but matched no expected shape | `unknown` |

## 6. Health Check

`YahooFinanceHealthProvider` maps MD-004's "Reachable / Response Valid / Provider Healthy" states onto the existing `healthy`/`degraded`/`down`/`unknown` vocabulary via a single `ping()` (a lightweight chart fetch) — a successful response means all three MD-004 states are satisfied in one step, since Yahoo's chart endpoint doesn't have a separate "reachable but invalid" state to distinguish. Never throws.

## 7. Design Notes — Judgment Calls Made Explicit

- **Yahoo Finance is explicitly NOT the primary quote source.** Per MD-004's own "Provider Purpose" and "IMPORTANT IMPLEMENTATION NOTE" sections, Twelve Data and Alpha Vantage remain primary for market quotes. `quoteClient`/`historicalDataClient` ARE implemented (the chart endpoint genuinely supports both, and there's no way to express "implements this but don't prefer it" within `MarketDataProvider`), but this provider's real value is its many additive methods no other provider offers.
- **A third distinct `enabled` convention.** Twelve Data/Alpha Vantage: key-presence-gated. CoinGecko: always `true`. Yahoo Finance: driven purely by the `YAHOO_ENABLED` config flag, since Yahoo has no API key to be present or absent — an honest reflection of a provider with no official access model at all.
- **Unofficial API, no SLA.** Yahoo Finance publishes no official public API. Every raw response shape in `yahoo-finance.types.ts` was reverse-engineered from the same unofficial `query1`/`query2.finance.yahoo.com` endpoints every open-source Yahoo client (yfinance, yahoo-finance2, etc.) uses, and Yahoo can change or block them without notice. Per MD-004's instruction, no raw Yahoo model ever crosses the provider boundary.
- **Crumb/cookie session handling.** `/v10/finance/quoteSummary` requires a session cookie + "crumb" token, obtained via a two-step handshake (`ensureCrumb()` in `yahoo-finance.client.ts`) and cached in memory. This is the single most fragile part of Yahoo's unofficial surface — a 401/403 clears the cached crumb and is retried once with a freshly negotiated one before giving up. `/v8/finance/chart` and `/v1/finance/search` need no authentication at all.
- **No dedicated rate-limit env var.** MD-004 names only `YAHOO_ENABLED`/`YAHOO_CACHE_TTL`/`YAHOO_TIMEOUT`/`YAHOO_RETRY_COUNT`. Since Yahoo publishes no official rate limit, `YAHOO_DEFAULT_REQUESTS_PER_MINUTE` (30) is a conservative, self-imposed constant, matching the precedent CoinGecko set in MD-002.
- **Mutual fund metadata reuses ETF metadata.** Yahoo's `fundProfile` quoteSummary module carries both ETF and mutual fund metadata under one identical shape — there is no separate mutual-fund-specific module. `getMutualFundMetadata()` delegates to `getEtfMetadata()`'s exact mapping.
- **`AssetClass` has no `MUTUAL_FUND` value.** `symbolSearchClient.search()` classifies Yahoo's `quoteType: "MUTUALFUND"` results as `EQUITY` — the closest existing category — since RMSM's `AssetClass` enum (`EQUITY | ETF | CRYPTO | FOREX | COMMODITY | INDEX | BOND | OPTION | FUTURE`) has no dedicated value. This is a known limitation, not a silent misclassification (see Section 9).
- **Only Daily/Weekly/Monthly historical intervals.** Yahoo's chart endpoint supports intraday granularities too, but MD-004's own Historical Data section names exactly three. Any other `CandleInterval` throws a clear error before any network call — the same honest-interval-support discipline established for CoinGecko (MD-002) and Alpha Vantage (MD-003).

## 8. Testing

9 spec files, **96 tests, all passing** — verified with a real Jest run (not just typecheck), using the actual source files and the real `@nestjs/common`/`ioredis` packages, in an isolated sandbox:

- `yahoo-finance.types.ts` — covered indirectly via mapper/client tests.
- `yahoo-finance.constants.spec.ts` — interval coverage, asset classes, module list, TTL-multiplier ordering.
- `yahoo-finance.error-mapper.spec.ts` — every classification branch, priority ordering, `isRetryable()`.
- `yahoo-finance.rate-limit.spec.ts` — sliding-window behavior, eviction.
- `yahoo-finance.cache.spec.ts` — hit/miss/failure-fallback, per-call TTL, key prefixing.
- `yahoo-finance.client.spec.ts` — chart URL building (period1/period2 vs. range shorthand), the full crumb/cookie negotiation flow (including 401-triggered re-negotiation and crumb/cookie never logged), search, envelope-error detection, retries, timeout/network/parsing classification.
- `yahoo-finance.mapper.spec.ts` — every mapping method, including null-padding-day handling in historical candles.
- `yahoo-finance.health.spec.ts` — healthy/degraded/down/unknown, consecutive-failure tracking.
- `yahoo-finance.provider.spec.ts` — full composition: all eleven feature methods, quote/historical (non-primary), symbol search, enabled/disabled via config flag.
- `yahoo-finance.module.spec.ts` — registry/factory registration, config-row overrides, shared cache instance.

**One real bug was caught and fixed during verification, before delivery:** the client's `request()` retry logic did not actually retry a stale-crumb 401/403 even though `ensureCrumb()` correctly cleared the cached crumb on that path — 401/403 was excluded from the general retryable-status check, so the crumb was cleared but the request still failed immediately instead of retrying with a freshly negotiated crumb. Caught by writing (and running) `yahoo-finance.client.spec.ts`'s crumb-refresh test, which failed against the original implementation; fixed by explicitly marking a stale-crumb 401/403 as retryable, distinct from a genuine (non-crumb) authentication failure.

**Full regression check:** the combined suite across CoinGecko (MD-002), Alpha Vantage (MD-003), and Yahoo Finance (MD-004) — 27 suites, 254 tests — all pass together in the same isolated sandbox, confirming this addition didn't affect any prior provider.

## 9. Known Limitations

- Yahoo Finance has no official public API. Every endpoint used here is unofficial, undocumented, and can change or be blocked by Yahoo without notice — this is inherent to the provider, not a defect in this implementation.
- The crumb/cookie session negotiation is the most fragile part of this integration. It is retried once on a 401/403, but a sustained Yahoo-side change to this flow (as has happened historically to every open-source Yahoo client) would require an update to `ensureCrumb()`.
- `AssetClass` has no `MUTUAL_FUND` value; mutual fund search results are classified as `EQUITY`.
- `getMutualFundMetadata()` is functionally identical to `getEtfMetadata()` — Yahoo's `fundProfile` module does not distinguish the two fund types.
- `getEarnings()`'s `revenue` field is left `undefined` — Yahoo's `earningsChart.quarterly` entries carry EPS but not revenue; revenue would need to be derived from `incomeStatementHistory` instead, which is a different reporting cadence (annual, not quarterly) and was not combined here to avoid conflating two different periods under one DTO.
- This provider's rate limit (30/minute) is a self-imposed, conservative estimate, not a documented Yahoo limit.

## 10. Future Improvements

- If Yahoo tightens or changes its crumb/cookie requirements further, consider a headless-browser-based crumb retrieval fallback (the approach some open-source Yahoo clients have adopted as a more resilient, if heavier, alternative).
- A dedicated `YAHOO_RATE_LIMIT` env var could be added later if real-world usage reveals the conservative default is either too strict or insufficiently conservative.
- `getEarnings()` could be extended to combine quarterly EPS with annual revenue from `incomeStatementHistory` into two clearly-labeled sub-objects, once there's a concrete consumer need for combined earnings+revenue reporting.
- Mutual-fund-specific metadata (if RMSM's `AssetClass` enum is ever extended with a `MUTUAL_FUND` value) could then get its own classification path in `toAssetClass()` instead of falling back to `EQUITY`.

## 11. Validation Checklist

| Check | Result |
|---|---|
| `tsc --strict --noEmit` against real interfaces + all new provider/config files | ✅ 0 errors |
| `tsc --strict --noEmit` against `@rmsm/config` schema/config additions | ✅ 0 errors |
| Real Jest execution (Yahoo Finance only) | ✅ 9/9 suites, 96/96 tests |
| Real Jest execution (combined regression: CoinGecko + Alpha Vantage + Yahoo Finance) | ✅ 27/27 suites, 254/254 tests |
| `pnpm lint` / `pnpm build` / Docker startup / API health | Not run directly (no live repo access in this environment) — code follows the exact lint-clean patterns already passing in MD-001/002/003 |
| No `process.env` usage | ✅ verified by inspection — only `@rmsm/config`'s `Env` type is read |
| No switch-statement provider registration | ✅ `ProviderFactoryService.registerBuilder()`, same as every other provider |
| Existing providers unaffected | ✅ no Internal Feed / Twelve Data / CoinGecko / Alpha Vantage file was touched |
| Prisma migration | Not needed — `YAHOO_FINANCE` already existed in the enum |
| No raw Yahoo response model exposed outside the provider | ✅ verified by inspection — only `yahoo-finance.mapper.ts` imports `yahoo-finance.types.ts` |

## 12. Manual Merge Steps Required

1. Apply this deliverable's files into the real repository (paths under `api/src/modules/market-data/providers/yahoo-finance/` and `packages/config/src/`).
2. Add `YAHOO_ENABLED`, `YAHOO_CACHE_TTL`, `YAHOO_TIMEOUT`, `YAHOO_RETRY_COUNT` to your `.env` (or deployment secrets) if you want values other than the documented defaults. `YAHOO_ENABLED` defaults to `true` and requires no key, so this provider is active out of the box unless explicitly disabled.
3. Run `pnpm install` — no new runtime dependencies were introduced (`ioredis`/`@nestjs/common` are already dependencies of `api`).
4. Run your standard `pnpm lint && pnpm typecheck && pnpm test && pnpm build` gate to confirm in your actual environment.
5. No database migration needed.
6. Because Yahoo Finance's endpoints are unofficial, monitor `YahooFinanceHealthProvider`'s health status after deployment — a sustained `down` status may indicate Yahoo has changed its crumb/cookie requirements again, requiring a follow-up patch to `yahoo-finance.client.ts`'s `ensureCrumb()`.
