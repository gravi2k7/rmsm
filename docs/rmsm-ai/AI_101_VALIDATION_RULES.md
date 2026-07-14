# AI-101 — Validation Rules Reference

Every rule enforced by Phase 2C's validation layer, in one place. Rules that **throw** reject
a record outright (`candle.validator.ts`, `tick.validator.ts`, `quote.validator.ts`,
`reference-data.validator.ts`, `provider-data.validator.ts`); rules that **return a finding**
flag a pattern for review without rejecting anything (`data-quality-rules.ts`,
`duplicate-detector.ts`) — per Phase 2C's explicit "no repair logic, validation only," neither
kind ever corrects a bad value.

## Candle Rules (throws `InvalidOhlcError`/`InvalidVolumeError`/`InvalidTimestampError`)

| Rule | Check |
|---|---|
| High ≥ Open | `high >= open` |
| High ≥ Close | `high >= close` |
| Low ≤ Open | `low <= open` |
| Low ≤ Close | `low <= close` |
| High ≥ Low | `high >= low` |
| Non-negative volume | `volume >= 0` (zero is valid — a bar with no trades) |
| Valid timeframe | `interval` is one of the 9 recognized `CandleInterval` values |
| Valid timestamp | `eventTime` is a valid `Date` |

## Tick Rules (throws `InvalidTimestampError`/`InvalidPrecisionError`/`InvalidVolumeError`)

| Rule | Check |
|---|---|
| Valid timestamp | `eventTime` is a valid `Date` |
| Positive price | `price > 0` |
| Non-negative size | `size >= 0` |

## Quote Rules (throws `InvalidTimestampError`/`InvalidPrecisionError`; returns market state)

| Rule | Check |
|---|---|
| Valid timestamp | `eventTime` is a valid `Date` |
| Positive bid (if present) | `bidPrice > 0` — bid is optional (one-sided quotes are legitimate) |
| Positive ask (if present) | `askPrice > 0` — ask is optional |
| Mid / spread | Computed only when both bid and ask are present |
| Crossed market | Flagged (`isCrossed: true`), not thrown — a real market anomaly, reported not rejected |

## Reference Data Rules (throws `InvalidProviderPayloadError`/`DuplicateRecordError`)

| Rule | Check |
|---|---|
| Required fields | Named fields are present and non-empty |
| In-batch uniqueness | No two items in the same batch share a key (the database's own unique constraint is the final word for cross-batch uniqueness — see the file's own comment) |
| ISIN format | 2 letters + 9 alphanumeric + 1 digit (format only, not checksum-verified — a known limitation) |
| CUSIP format | 9 alphanumeric characters (format only) |

## Provider Data Rules (throws `InvalidProviderPayloadError`)

| Rule | Check |
|---|---|
| At least one asset class declared | `assetClasses.length > 0` |
| At least one market declared | `marketsSupported.length > 0` |
| Historical support implies timeframes | `supportsHistorical` true requires `timeframes.length > 0` |
| Capability requirement match | A specific request (asset class, interval, needs-X) is checked against declared metadata |
| Valid configuration URL | `baseUrl`, if present, parses as a valid URL |
| Positive rate limit | `rateLimitPerMinute`, if present, is `> 0` |

## Data Quality Findings (return a finding, never throw)

| Rule | Function | Detects |
|---|---|---|
| Invalid values | `RmsmInvalidValueDetector` (Phase 1's `InvalidValueDetector`, implemented for real this phase) | negative/zero price, negative volume, high < low, open/close outside the high-low range |
| Out-of-order | `RmsmOutOfOrderDetector` (Phase 1's `OutOfOrderDetector`, implemented for real this phase) | a candle whose `eventTime` precedes the previous candle in arrival order |
| Missing fields | `checkMissingFields` | any required candle field absent |
| Future timestamp | `checkFutureTimestamp` | `eventTime` after "now" |
| Negative timestamp | `checkNegativeTimestamp` | `eventTime` before the Unix epoch |
| Invalid timeframe | `checkInvalidTimeframe` | an unrecognized interval string |
| Invalid symbol | `checkInvalidSymbol` | empty/whitespace-only symbol |
| Provider inconsistency | `checkProviderInconsistency` | the same `providerSymbol` reported with a different currency within one batch |
| Duplicate detection | `detectCandleDuplicates`/`detectTickDuplicates`/`detectQuoteDuplicates` | repeated records within one batch, keyed per data type |

**Not implemented, by design**: `GapDetector` (Phase 1's third detection contract) — real gap
detection needs to know what data *should* exist, which requires trading-session awareness and
repository access this side-effect-free validation layer deliberately doesn't have.

## Decimal & Time Precision Rules

| Rule | Enforcement |
|---|---|
| No floating-point loss | All decimal normalization is string-based; numbers are only accepted as input, never used for storage-bound arithmetic |
| Maximum scale | Caller-specified per field (matches the schema's actual `@db.Decimal` precision); exceeding it throws `InvalidPrecisionError`, never silently truncates |
| UTC storage | Every `normalizeTimestamp()` output is a UTC `Date` |
| Timezone conversion | `convertToUtc()` requires a valid IANA identifier; an invalid one throws `InvalidTimezoneError` rather than silently misinterpreting the offset |

## Symbol Normalization Rules

| Input pattern | Output |
|---|---|
| `EXCHANGE:SYMBOL` | `{ exchangeHint: "EXCHANGE", symbol: "SYMBOL", format: "exchange_prefixed" }` |
| `BASE/QUOTE` | `{ symbol: "BASE-QUOTE", baseCurrency: "BASE", quoteCurrency: "QUOTE", format: "slash_pair" }` |
| Plain (e.g. `AAPL`, `BTCUSDT`) | `{ symbol: <uppercased, trimmed>, format: "plain" }` — concatenated pairs are **not** split (ADR-028) |
