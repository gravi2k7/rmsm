# AI-102 — Phase 2B: Computation Infrastructure

Status: Complete — Awaiting Architecture Review Before Phase 2C

The execution engine, real for the first time — `ComputationEngineService` genuinely orchestrates
a request through its full lifecycle (validate → prepare context → invoke → produce result),
`ExecutionSchedulerService` genuinely runs multiple requests sequentially, and this is the first
phase where AI-102 actually calls AI-101's `MarketDataService` for real candle data. No real
indicator calculations exist yet — that honest limitation is structural, not incidental, and
verified by tests that assert it.

## Architecture Decisions

### `ExecutionContext` supersedes Phase 1's `IndicatorContext`
Phase 1's `IndicatorContext` had 5 fields (`instrumentId`/`timeframe`/`parameters`/`candles`/
`dependencyResults`). This phase's own item 2 names 9 fields, richer and referencing Phase 2A's
`IndicatorInstance`/`IndicatorDefinition` directly. Resolved by a genuine restructuring —
`ExecutionContext` replaces `IndicatorContext` everywhere, including `Indicator.calculate()`'s
own signature — the same category of change as Phase 2A's `IndicatorMetadata` split, flagged
explicitly rather than silently layered on top of the old shape.

### `ExecutionRequest`'s "execution context" field, interpreted deliberately
Item 6 lists "execution context" as something an `ExecutionRequest` carries — but building the
`ExecutionContext` is `ComputationEngine`'s own job (item 1); a request that already contained a
fully-built context would make that preparation step meaningless. Interpreted as "the request
carries what's *needed* to build a context" instead (`calculationWindow`, `marketDataReference`,
`timeframe`) — a judgment call, stated as one rather than silently reinterpreting the spec.

### `ComputationEngine` (item 1) vs. `ComputationScheduler` (Phase 1) vs. `ExecutionScheduler` (item 5) — three genuinely different things
`ComputationEngine` orchestrates ONE request through its full lifecycle. Phase 1's
`ComputationScheduler` is dependency-graph-aware BATCH scheduling — explicitly Phase 2C's job,
left untouched this phase with a scope note added. `ExecutionScheduler` (this phase) sequences
MULTIPLE independent (non-dependent) requests — real, sequential, with honest "no true
parallelism" framing. Three names that could have collided; kept deliberately distinct.

### A real bug in the lifecycle transition table, caught while writing the engine itself
The original `LIFECYCLE_TRANSITIONS` table didn't allow `READY → FAILED` — but
`ComputationEngineService`'s real control flow can fail between reaching `READY` and actually
starting `EXECUTING` (e.g. `IndicatorFactoryService.create()` throwing). Caught while writing
the engine's own error-handling path, not in a separate review pass — fixed before it could ever
manifest as a confusing "cannot transition to FAILED" secondary error masking the real one.

### Every real indicator fails at the factory step — by design, verified, not accidental
`IndicatorFactoryService` is genuinely implemented (Map-based, no switch statements, the same
shape as every provider factory in this project) but genuinely empty of calculation builders —
none of EMA/RSI/MACD/ATR/RDSE has a real `calculate()` yet. `ComputationEngineService`'s own
test suite asserts this exact outcome for a real registered definition (`IndicatorNotFoundException`,
surfaced as a clean `FAILED` result, not a crash) — the honest state of this phase's own
pipeline, proven rather than assumed.

## Execution Flow (What Actually Runs, End to End)

```
ExecutionRequest
    │
    ├─ 1. ExecutionValidatorService.validateNotCancelled/validateTimeoutConfiguration
    │       → tracker: REGISTERED → VALIDATED
    │
    ├─ 2. IndicatorRegistryService.getVersion(instance.definitionIdentifier, instance.definitionVersion)
    │       (real, Phase 2A)
    │
    ├─ 3. If definition.dependencies.length > 0: CalculationWindowException, fail fast —
    │       AI-101 is never even called (a real, tested short-circuit)
    │
    ├─ 4. MarketDataService.getCandles(...) — the first real AI-101 integration point in AI-102
    │
    ├─ 5. ExecutionContext assembled, Object.freeze()-d
    │
    ├─ 6. ExecutionValidatorService.validateContext/validateMarketDataPresence/
    │       validateTimeframe/validateParameters
    │       → tracker: VALIDATED → INITIALIZED → READY
    │
    ├─ 7. IndicatorFactoryService.create(identifier, parameters)
    │       → tracker: READY → EXECUTING
    │       (throws IndicatorNotFoundException for every real indicator this phase — honest)
    │
    ├─ 8. indicator.calculate(context) — only reachable once Phase 2C+ registers a real one
    │       → tracker: EXECUTING → COMPLETED
    │
    └─ 9. ExecutionMetricsService records the real timing breakdown;
            ExecutionResult assembled, Object.freeze()-d, returned
```

Any failure at any step transitions the tracker to `FAILED` (or is caught and reported even when
the transition itself can't complete) and returns a genuine `ExecutionResult` with
`lifecycleStatus: "FAILED"` and a real error message — `ComputationEngineService.execute()`
never throws to its own caller; every outcome, success or failure, is a returned `ExecutionResult`.

## Assumptions

- `queueTimeMs` is always `0` this phase — no queue infrastructure exists yet (item 5's own "no
  threading implementation... architecture only"), stated honestly rather than estimated.
- `ExecutionSchedulerService.cancelAll()` only prevents not-yet-started requests from beginning;
  it cannot interrupt an in-flight `calculate()` call, consistent with indicators being expected
  to be fast, pure functions (Phase 1's Core Principles) with no cancellation-checking
  obligation of their own.

## Known Limitations

- No indicator can actually execute successfully yet — every one of Phase 2A's 28 definitions
  fails at the factory step. This is not a bug; it is the accurate state of the project before
  Phase 2C+ builds real calculation implementations.
- No indicator with dependencies (MACD, Keltner Channel, every composite proprietary indicator)
  can execute even once calculation implementations exist for its leaf dependencies — dependency
  resolution/execution is explicitly Phase 2C's job, checked and rejected clearly rather than
  silently mishandled.
- `ExecutionEvent` contracts (item 11) are real types with no publisher — nothing in this phase
  constructs or emits one; that wiring is a named Phase 2C+ follow-up.

## Phase 2C Prerequisites

1. Dependency graph EXECUTION (not just registration-time existence checks, Phase 2A) —
   resolving and populating `ExecutionContext.dependencyResults` for real.
2. At least one real `Indicator.calculate()` implementation, registered via
   `IndicatorFactoryService.registerBuilder()`, to prove the full pipeline's success path against
   a genuine calculation (this phase's own tests use a fake/stub `calculate()` for that proof —
   real, but not a real indicator).
3. A decision on the 2m/3m/4m timeframe gap (`AI102_PHASE1_ARCHITECTURE.md` Section 5) remains
   open and unaffected by this phase.

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors — 1 real unused-import error found and fixed |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors, first attempt |
| New tests (33 cases across 5 files) | ✅ Genuinely executed — including a real lifecycle-table bug caught and fixed during this phase's own build, not before it |
| Full suite | ✅ 47/47 suites, 328/328 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before Phase 2C.**
