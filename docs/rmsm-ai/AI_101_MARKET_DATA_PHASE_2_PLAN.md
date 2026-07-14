# AI-101 — Phase 2 Implementation Plan

Proposed breakdown, following the same phased-delivery, stop-for-approval-at-each-stage
discipline as every EP module.

## Phase 2a — Repositories
One repository class per model (14: `MarketDataProviderConfig`, `Exchange`, `TradingSession`,
`SupportedTimeframe`, `Instrument`, `InstrumentAlias`, `MarketCandle`, `MarketQuote`,
`MarketTick`, `CorporateAction`, `DataImportJob`, `DataQualityIssue`, `DataGap` — 13, matching
the "one repository per model" convention every EP module has used, not the grouped-contract
convention Phase 1 used for interfaces). `DbClient`-parameterized, explicit named return types
from the start (TS2742 discipline, learned expensively across EP-002/003/004), proactive
avoidance of the nullable-compound-key `upsert` bug this project has hit four times now — worth
checking `InstrumentAlias`'s `[providerId, providerSymbol]` and `SupportedTimeframe`'s
`[providerId, interval]` unique constraints specifically before reaching for `upsert()` on
either, even though neither currently has a nullable component (both are safe today; flagged as
the exact kind of thing to re-verify if either constraint's shape ever changes).

## Phase 2b — Provider Adapters
Implementations of `MarketDataProvider` for each named future provider, against real REST APIs,
no SDK — the same rigor Module 004 (Stripe/Razorpay/PayPal) and Module 005 (11 providers)
applied. Given the scope Module 005's Phase 2b turned out to be (11 providers in one phase was
a lot), this may warrant splitting into per-provider or per-category checkpoints rather than one
giant phase — flagging that sizing question now rather than assuming either answer.

## Phase 2c — Services
`MarketDataService` (orchestrator), `InstrumentService`, `CandleService`, `QuoteService`,
`DataQualityService` (implementing the detection/workflow contracts from Phase 1),
`ImportJobService`. Transaction composition where needed (e.g. writing a batch of candles +
updating the parent `DataImportJob`'s progress counters atomically).

## Phase 2d — Synchronization
BullMQ-based sync jobs (reusing EP-001's existing queue infrastructure, per this module's own
"do not duplicate platform capabilities" instruction — no new queue system) for live polling,
scheduled historical backfills, and corporate-action syncs. Gap detection and backfill workflow
wiring.

## Phase 3 — Controllers, DTOs Refinement, Guards
REST endpoints for instrument search, candle/quote queries (using Phase 1's DTOs as the
starting shape), and admin provider management — `PermissionsGuard` wired in at this point (new
`market-data.*` permission keys seeded here, not before, matching every EP module's own
"don't seed permissions before there's an endpoint to gate" discipline).

## Phase 4 — Testing, Documentation, Release
Repository/service unit tests (with the `jest.mock("@rmsm/database", ...)` standard EP-005
Phase 2a established and confirmed as project-wide policy), integration tests, load testing for
high-volume candle ingestion specifically (this subsystem's highest-throughput path), final
verification and changelog.

## Explicit Non-Goals, Named Rather Than Silently Assumed

- No indicators, strategies, backtesting, portfolio, or AI analysis logic anywhere in AI-101 —
  those are AI-102 through AI-110's job, consuming AI-101's contracts.
- No WebSocket/streaming implementation until a phase explicitly scopes it in (the prompt's own
  "do not implement WebSockets" applies to Phase 1; whether streaming belongs in AI-101 itself
  or a future module is a real open question worth confirming before Phase 2d assumes either
  answer).
- No holiday-calendar modeling this phase or the next — `TradingSession.dayOfWeek` handles
  weekly patterns; exchange-specific holidays (Christmas, Thanksgiving, etc.) are a real,
  named gap flagged in the schema's own comments, not silently deferred without mention.

---

**Awaiting your approval of this plan before Phase 2a begins.**
