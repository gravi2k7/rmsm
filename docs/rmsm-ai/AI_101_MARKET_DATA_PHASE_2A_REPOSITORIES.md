# AI-101 — Phase 2A: Repository Layer

Status: Complete — Awaiting Approval Before Phase 2B (Provider Infrastructure)

13 repositories, a full domain-model layer, and the Prisma→domain mapping that separates them
— built exactly to the pattern you specified: `Repository → returns domain models → never
returns Prisma-specific objects to services`.

## 1. What "Never Returns Prisma-Specific Objects" Means, Concretely

This is a genuine departure from every EP module's convention (EP-002 through EP-005 all
return Prisma-generated types directly), applied here because you asked for it specifically,
not because I decided AI-101 needed different architecture — recorded as ADR-025, including the
open question of whether this should become a wider standard (not decided unilaterally here).

Three-layer structure:
- `interfaces/models/` — 13 plain domain-model interfaces, one per entity, grouped into 3 files
  (`reference-data.models.ts`, `time-series.models.ts`, `operational.models.ts`).
- `repositories/mappers/` — one pure function per entity (`toInstrumentModel`,
  `toMarketCandleModel`, etc.) converting a Prisma row into its domain model. Every repository
  method funnels its result through the matching mapper before returning — one place the
  conversion happens, not reimplemented per method.
- `repositories/*.repository.ts` — the 13 repositories themselves, typed to return domain
  models only.

**The concrete thing this actually prevents**: `Prisma.Decimal` (a `decimal.js` class with its
own arithmetic methods — not a plain value) never reaches a service. Every `Decimal`-typed
column (`Instrument.tickSize`/`lotSize`, every OHLCV field on `MarketCandle`, `MarketQuote`'s
price/size fields, `MarketTick.price`/`size`, `CorporateAction.value`) becomes a plain `string`
in its domain model, via `.toString()` in the mapper — this preserves full decimal precision
(the entire reason `Decimal` exists) without leaking a Prisma-runtime class past the repository
boundary.

**What I deliberately did *not* convert**: enum types (`AssetClass`, `CandleInterval`, etc.)
are reused directly from `@rmsm/database` in the domain models, not re-declared under new
names. These are plain TypeScript string-literal unions with zero runtime coupling to
`@prisma/client` — no class, no special behavior, nothing "Prisma-specific" about them in the
sense this instruction is targeting. Re-declaring an identical union a second time would be
pure duplication for no actual isolation benefit — flagged as a judgment call, not a silent
narrowing of the rule's scope.

## 2. Two Real Mistakes Caught During Verification, Not After

**A genuine TypeScript inference bug**, not a style issue: `MarketCandleRepository.findCorrectionChain()`'s
`while` loop originally left `row` untyped, and `tsc` correctly flagged a circular-inference
error (`row` referenced in its own initializer) — caused by the loop reassigning `currentId`
from `row.supersedesId` combined with an inferred-from-context type on `row` itself. Fixed with
an explicit `MarketCandle | null` annotation. Caught by the typecheck step working exactly as
intended, not missed and shipped.

**A genuine bug in my own test fixture**, caught by `tsc` a second time: the
`findCorrectionChain` test's `original` object spread `...baseInput` *after* explicitly setting
Decimal-like mock objects on `open`/`high`/`low`/`close`/`volume` — meaning the spread silently
overwrote my mocks with plain strings, defeating the point of mocking a Decimal-like shape at
all. `tsc` flagged it as "specified more than once." Fixed by reordering the spread.

## 3. The Correction-Aware Design the Domain Model Made Explicit

`MarketCandleRepository` exposes two clearly distinct write paths, not one method trying to be
both:
- `upsert()` — for a still-forming candle (a live 1-minute bar's OHLCV values legitimately
  change as more trades arrive during that minute). Safe as a real `upsert`, since
  `[instrumentId, interval, eventTime, source]` has no nullable component.
- `createCorrection()` — the ADR-022 path: always `create`, never `update`, always sets
  `supersedesId`. A unit test asserts `upsert` is never called from this method, specifically
  to keep this distinction from quietly eroding in a future edit.

And the read path the Phase 2 plan explicitly required as a first-class method:
`findRangeCurrentValues()` filters out superseded rows (`supersededBy: null`), so callers get
"the current best value" without reconstructing that filter themselves each time.
`findCorrectionChain()` walks the full correction history for one logical candle, oldest first
— the audit trail, not just the latest value.

## 4. A Named, Real Performance Limitation (Not Silently Accepted)

`MarketQuoteRepository.findLatestForMany()` issues one query per instrument rather than a
single grouped query — Prisma 5.x has no native "latest row per group" primitive without raw
SQL, and this project's standing rule (established in EP-004/EP-005) is the query builder over
raw SQL wherever avoidable. This is genuine N+1 for a large `instrumentIds` list. Flagged in
the code as a real follow-up for Phase 2C or later if quote-freshness lookups become an actual
hot path — not silently accepted as fine, not fixed speculatively before there's a real
performance requirement to fix it against.

## 5. Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`, `@rmsm/database`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — 2 real errors found and fixed (Section 2), not zero on the first attempt |
| New `MarketCandleRepository` tests (6 cases) | ✅ Genuinely executed and passing (`jest.mock("@rmsm/database", ...)`, per ADR-019's confirmed project standard) |
| Full suite | ✅ 65/65 (59 prior + 6 new) |
| TODO/placeholder/bare-`any` scan | ✅ none found |

## 6. What's Deferred to Phase 2B

Provider adapter implementations (Binance, Polygon, Twelve Data, Alpha Vantage, Yahoo Finance)
against Phase 1's `MarketDataProvider`/`HistoricalDataClient`/`QuoteClient`/
`SymbolSearchClient` interfaces — REST-only, no streaming (per the approved decision, ADR-023).

---

**Awaiting your review before Phase 2B.**
