# AI-102 — Release Notes

## v1.1.0 — Indicator Engine, Phases 1–5 Complete

AI-102 is the indicator computation engine for RMSM AI, built on Enterprise Platform v1.0 and
AI-101 Market Data. This release covers architecture through production hardening (Phases
1–5); no real indicator calculations are included — AI-102 is orchestration infrastructure, and
building EMA/RSI/MACD/RDSE/etc. on top of it is deferred to future work.

### What's Included, By Phase

- **Phase 1 — Architecture**: 14 contracts, folder structure, zero implementation. Justified
  the decision not to add a database schema (indicator definitions are code, like AI-101's own
  providers).
- **Phase 2A — Registry**: Real `IndicatorRegistryService` — registration, version management
  (multiple versions of one indicator coexist, e.g. RDSE at 1.0.0/1.1.0/2.0.0), enforced
  immutability. 28 named indicator definitions registered (19 built-in, 9 proprietary),
  metadata only.
- **Phase 2B — Computation infrastructure**: Real `ComputationEngineService` — full lifecycle
  tracking, timeout handling, a real circuit-breaker-adjacent execution path, and the first
  real AI-101 integration point (`MarketDataService.getCandles()`).
- **Phase 2C — Dependency graph & planning**: Real topological sort (Kahn's algorithm), real
  cycle detection (correctly distinguishing cycles from legitimate diamond dependencies), a
  real execution planner with a computed complexity estimate.
- **Phase 3 — Service layer**: `IndicatorEngineServiceImpl`, the single public entry point.
  The full pipeline connects end to end for the first time — a dependency-bearing indicator
  (MACD-shaped) can genuinely execute, receiving its own dependency's real computed result.
- **Phase 4 — REST API**: `IndicatorController`, 8 endpoints, real DTO validation, real
  error-code-based exception mapping, real OpenAPI documentation.
- **Phase 5 — Production hardening**: Fail-fast startup validation, structured execution
  logging (requestId/executionId/graphId/indicatorId/duration/status on every execution), a
  real caching performance fix, and 2 real DTO validation gaps closed.

### Major Capabilities Delivered

- A complete, real orchestration pipeline: registry → dependency graph → execution planner →
  computation engine → service layer → REST API, every layer genuinely wired to the next.
- Multi-version indicator support, proven with RDSE's own 3 real versions.
- Dependency resolution and execution, proven with a real MACD-shaped indicator receiving its
  EMA dependency's real result — the concrete integration this project's own Phase 2C docs
  named as a Phase 3 prerequisite, delivered.
- 28 real indicator definitions spanning all 9 categories (Trend, Momentum, Volatility, Volume,
  Market Structure, Pattern Recognition, Composite, Custom, Experimental), including
  institutional_structure's real 4-way proprietary dependency chain.
- A single, documented public entry point (`IndicatorEngineService`) every future module can
  safely depend on without touching internal layers directly.

### What's NOT Included (By Design)

- **No real indicator calculations.** Every one of the 28 registered definitions fails cleanly
  and honestly at the calculation step — `IndicatorFactoryService` has zero calculation
  builders registered. This is the single most important thing to understand about this
  release: the orchestration is real and production-ready; the arithmetic is not.
- **No WebSocket, GraphQL, or streaming APIs** — REST only, per every phase's own scope.
- **No caching of computed results** — `IndicatorResultCache` (Phase 1's own contract) has no
  implementation; only the dependency GRAPH is cached (Phase 5's own performance fix), not
  computed indicator VALUES (which don't exist yet regardless).
- **No execution-result persistence** — the status-lookup endpoint always returns 501.

### Breaking Changes

None across all 5 phases — every phase was additive or a flagged, documented restructuring of
AI-102's own internal contracts (never a breaking change to anything outside this module). No
AI-101 file was ever modified in a way that changes existing behavior.

### Upgrade Notes

- Run the standard permission-seed sequence — 2 new keys (`indicator-engine.read`,
  `indicator-engine.execute`) are seeded automatically into existing role tiers.
- No new environment variables required.
- `IndicatorEngineModule` must be imported wherever AI-102 is consumed — already wired into
  `AppModule`.

### Known Limitations Summary

See `AI102_PRODUCTION_READINESS_REPORT.md` for the complete, consolidated list with reasoning;
the most operationally significant is the complete absence of real calculation implementations
— this release is infrastructure, not a working indicator library, by explicit design through
every one of its 5 phases.
