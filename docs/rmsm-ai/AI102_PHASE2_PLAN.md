# AI-102 — Phase 2 Plan (Proposed)

Following the same phased-delivery, stop-for-approval discipline as every prior module —
proposed, not yet approved.

## Phase 2A — Registry & Factory Implementation

Real `IndicatorRegistryService`/`IndicatorFactoryService` (Map-based, no switch statements —
the same discipline AI-101 Phase 2B established), plus `IndicatorRegistrarService` for
startup registration. No real indicator calculations yet — this phase proves the
registration/lookup/discovery pipeline works, the same role `InternalFeedProvider` played for
AI-101's own Phase 2B.

## Phase 2B — Dependency Graph & Validation

Real `DependencyGraph` (topological sort, cycle detection — tested against both a valid
multi-level chain and a deliberate cycle) and `IndicatorValidator` implementations.

## Phase 2C — First Real Indicators

A small, deliberately limited set to prove the full pipeline end to end — proposed: SMA, EMA
(the simplest trend indicators, and EMA is MACD's own dependency, useful for Phase 2D). Real
`Indicator.calculate()` implementations, golden-dataset tests, deterministic-replay tests.

## Phase 2D — Composite Indicators & Computation Engine

MACD (depending on the two EMAs from 2C) as the first real composite indicator, proving
dependency resolution end to end. Real `ComputationScheduler` implementation (execution
ordering, parallelizable-group detection, partial-failure handling).

## Phase 2E — Caching

Real in-memory `IndicatorResultCache` implementation. Distributed (Redis-backed) caching
remains a later, explicitly separate follow-up, not bundled into this phase.

## Explicitly Still Deferred Beyond Phase 2

- The remaining built-in indicators (RSI, Stochastic, ATR, ADX, CCI, ROC, Bollinger Bands,
  Donchian, Keltner, VWAP, OBV, SuperTrend, Ichimoku, Parabolic SAR, WMA, VWMA, HMA) — a
  realistic, larger body of work for later phases, not attempted in one batch.
- All 9 proprietary indicators (RDSE, Market State Engine, Swing Detection, BOS, CHOCH,
  Liquidity, Order Blocks, Fair Value Gaps, Institutional Structure) — genuinely complex
  domain logic, each likely deserving its own phase or sub-phase given the care AI-101's own
  provider adapters would have needed had real SDK integration been in scope.
- Incremental calculation's real implementation (`IncrementalIndicator`) — proposed for a
  Phase 2F or later, after the full-recalculation path is proven correct first (the safer build
  order: get the slow-but-correct path working, then optimize).
- REST controllers, services, repositories — this remains an internal engine through all of
  Phase 2; a REST layer (mirroring AI-101's own Phase 4) is a later, separate phase.
- The 2m/3m/4m timeframe gap (`AI102_PHASE1_ARCHITECTURE.md` Section 5) — resolving it needs a
  decision this plan doesn't make (AI-101 schema extension vs. AI-102 synthetic aggregation),
  genuinely open for architecture review.

---

**Awaiting your approval of this plan before Phase 2A begins.**
