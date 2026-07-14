# AI-101 — Provider Contracts

## Why This Shape

The fourth application of the same provider-abstraction pattern this project has used since
EP-002 (OAuth), reused again in EP-004 (payments) and EP-005 (email/SMS/push): an adapter
interface, a registry, and a factory — no vendor SDK dependency anywhere above the provider
layer. Not a new architecture invented for market data; a proven one applied a fourth time.

## The Contracts

### `NormalizedCandle` / `NormalizedQuote` / `NormalizedTick` / `NormalizedSymbolSearchResult`
(`interfaces/normalized-market-data.interface.ts`)

The provider-agnostic shapes every adapter (Phase 2+) must produce. This is the mechanism
behind the quality requirement "no untyped external-provider payloads": a provider's own raw
response shape (Binance's JSON, Polygon's JSON, whatever Alpha Vantage returns) is confined
entirely to that provider's own adapter file in Phase 2 and never leaks past it. Every other
contract in this module speaks only in these normalized types.

### `MarketDataProvider` / `MarketDataProviderFactory` / `ProviderRegistry`
(`interfaces/market-data-provider.interface.ts`)

`MarketDataProvider` is the composite contract one Phase 2 adapter class implements per
`MarketDataProviderType` — exposing whichever of `HistoricalDataClient`/`QuoteClient`/
`SymbolSearchClient` it actually supports (not every provider offers all three).
`MarketDataProviderFactory` constructs an instance from a `MarketDataProviderConfig` row's
non-secret config plus a resolved credential (fetched via `credentialReference` from wherever
secrets actually live — a Phase 2 concern). `ProviderRegistry` is the lookup side. Same
registry+factory split as EP-005's `ProviderFactory`/`EmailProviderRegistry` pair.

### `HistoricalDataClient` (`interfaces/historical-data-client.interface.ts`)
Fetches a range of candles for one provider symbol/interval/date-range, with opaque
provider-defined pagination (`pageCursor`) — this contract doesn't give that cursor meaning,
each Phase 2 adapter interprets its own.

### `QuoteClient` (`interfaces/quote-client.interface.ts`)
Fetches the latest quote for one or many provider symbols.

### `SymbolSearchClient` (`interfaces/symbol-search-client.interface.ts`)
Searches a provider's own symbol universe by free-text query — the mechanism a future
Phase 2+ "add an instrument" admin flow would use to discover what a provider calls something,
before `InstrumentAlias` ever gets a row for it.

### `ProviderRateLimitPolicy` (`interfaces/provider-rate-limit-policy.interface.ts`)
Protects **this system** from exceeding **a provider's** rate limit — the opposite direction of
concern from Module 001's `ThrottlerModule`, which protects this API's own endpoints from
external abuse. Two different problems that happen to both be called "rate limiting."

### `ProviderErrorMapper` (`interfaces/provider-error-mapper.interface.ts`)
Classifies one failed call (`rate_limited` / `authentication_failed` / `symbol_not_found` /
`provider_outage` / `invalid_request` / `unknown`) so callers never need provider-specific
knowledge to decide how to react — every adapter maps its own SDK-free REST client's errors
into this shared vocabulary.

## Data Quality Contracts

Split into two files by whether they *detect* a problem or *act* on one — a deliberate
organizational choice (matching EP-005 Phase 1's precedent for grouping repository contracts),
not an arbitrary one:

**`contracts/detection.contracts.ts`** — `GapDetector`, `DuplicateDetector`,
`OutOfOrderDetector`, `InvalidValueDetector`, `StaleQuoteDetector`. Every one is a pure-function
shape: given data, return a finding. Turning a finding into a persisted `DataQualityIssue`/
`DataGap` row is a Phase 2+ service's job, not this contract's.

**`contracts/workflow.contracts.ts`** — `SessionValidator` (validates an event time against an
exchange's real trading calendar, not just "is this a weekday"), `ProviderOutageClassifier`
(overall provider health from a pattern of recent errors — distinct from `ProviderErrorMapper`,
which classifies one call), `BackfillWorkflow` (resolves a known `DataGap`), and
`ManualCorrectionWorkflow` (produces a new superseding `MarketCandle` row per ADR-022, never an
in-place update — enforced at the contract level, not just documented intent a Phase 2
implementation could accidentally violate).

## What Phase 2 Actually Implements Against These

Every adapter class (Binance, Polygon, Twelve Data, Alpha Vantage, Yahoo Finance, TradingView
bridge, broker bridges, internal feeds — the prompt's named future set) implements
`MarketDataProvider` plus whichever client interfaces it supports, using raw `fetch` calls
against that provider's REST API — no SDK, matching this project's standing rule for every
provider integration since EP-002.
