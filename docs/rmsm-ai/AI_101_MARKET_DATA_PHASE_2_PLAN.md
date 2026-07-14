# AI-101 — Phase 2 Plan (Approved Structure)

Status: Approved by product owner — awaiting explicit go-ahead to begin Phase 2A.

This supersedes the original draft plan with the confirmed structure and decisions from the
Phase 2 kickoff approval.

## Approved Decisions (Recorded)

1. **Phase structure**: three sub-phases, each a stop-for-approval checkpoint on its own —
   2A (Repository Layer), 2B (Provider Infrastructure), 2C (Normalization & Validation). Not
   one combined "Phase 2."
2. **Streaming is out of scope for all of Phase 2**, not just deferred within it. AI-101 is
   confirmed as the sole owner of every ingestion transport — REST, WebSocket, FIX, MT5 Bridge,
   TradingView Bridge, and any future streaming adapter — but none of them are built until a
   later, separate AI-101 phase. Recorded as ADR-023.
3. **Trading calendar stays weekly-only** (`TradingSession.dayOfWeek`) through Phase 2.
   `TradingHoliday`/`TradingCalendar`/`SpecialTradingDay` are confirmed future work, verified
   as a zero-impact additive extension when they arrive (ADR-024) — not implemented now.
4. **Architecture rule reaffirmed**: AI-101 is the sole source of market data for RMSM AI.
   AI-102 and every later module consumes AI-101's services/contracts exclusively; none may
   connect to an exchange or a provider SDK directly. This was already the Phase 1 design;
   this decision confirms it as binding for every future module's own planning, not just this
   one's.

## Phase 2A — Repository Layer

One repository class per model (13: `MarketDataProviderConfig`, `Exchange`, `TradingSession`,
`SupportedTimeframe`, `Instrument`, `InstrumentAlias`, `MarketCandle`, `MarketQuote`,
`MarketTick`, `CorporateAction`, `DataImportJob`, `DataQualityIssue`, `DataGap`) — the
established one-repository-per-model convention every EP module has used, not Phase 1's
grouped-contract convention (which was specific to interface *declarations*, not
implementations).

Carried-forward discipline, checked at each repository as it's built, not assumed:
- `DbClient`-parameterized, explicit named return types from the start (TS2742 discipline).
- Nullable-compound-key `upsert()` avoidance — this project's four-time-repeated bug class.
  Every unique constraint in AI-101's schema is currently on non-nullable fields (verified in
  Phase 1's data model doc), so plain `upsert()` is safe everywhere in this schema as it
  stands today — re-verify this specifically if any constraint's shape changes before or
  during 2A.
- `MarketCandle`'s correction chain (`isCorrection`/`supersedesId`, ADR-022): the repository
  layer must expose a "latest non-superseded value" read path as a first-class method, not
  something every caller has to reconstruct with an ad-hoc filter — this is where that
  contract gets satisfied for real.

## Phase 2B — Provider Infrastructure

`MarketDataProvider` adapter implementations (Phase 1's interfaces) for the named REST-based
providers — Binance, Polygon, Twelve Data, Alpha Vantage, Yahoo Finance — via raw REST calls,
no SDK, matching every provider integration in this project since EP-002.

**Explicitly excludes** (per the approved streaming decision): WebSocket connections, FIX
sessions, MT5 Bridge, TradingView Bridge, and any other streaming transport. 2B is
REST-only — `HistoricalDataClient`/`QuoteClient`/`SymbolSearchClient` implementations,
`ProviderRegistry`/`MarketDataProviderFactory` wiring, `ProviderRateLimitPolicy`/
`ProviderErrorMapper` implementations. Streaming adapters (including broker bridges) are a
later, separate AI-101 phase, not folded into 2B.

## Phase 2C — Normalization & Validation

Implementations of Phase 1's data-quality contracts (`detection.contracts.ts`,
`workflow.contracts.ts`) — `GapDetector`, `DuplicateDetector`, `OutOfOrderDetector`,
`InvalidValueDetector`, `StaleQuoteDetector`, `SessionValidator`,
`ProviderOutageClassifier`, `BackfillWorkflow`, `ManualCorrectionWorkflow` — plus the
normalization layer that turns a provider's raw payload into Phase 1's `NormalizedCandle`/
`NormalizedQuote`/`NormalizedTick`/`NormalizedSymbolSearchResult` shapes and resolves provider
symbols through `InstrumentAlias`.

## Explicitly Still Deferred Beyond Phase 2 (Not Silently Dropped)

- **All streaming/real-time ingestion** (WebSocket, FIX, MT5 Bridge, TradingView Bridge,
  broker bridges) — a later, separate AI-101 phase, per ADR-023.
- **Trading calendar/holiday support** (`TradingHoliday`, `TradingCalendar`,
  `SpecialTradingDay`) — a later AI-101 phase, per ADR-024.
- **Orchestration services** (`MarketDataService` and friends), **synchronization workers**
  (BullMQ jobs), and **controllers** — not scoped into 2A/2B/2C; these come after, in a phase
  this plan doesn't number yet since the approved structure only confirmed 2A/2B/2C. Naming
  this explicitly rather than letting "Phase 2" implicitly seem complete once 2C ships.

---

**Awaiting explicit go-ahead to begin Phase 2A.**
