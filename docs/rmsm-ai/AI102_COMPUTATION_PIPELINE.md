# AI-102 — Computation Pipeline

Covers the internals `AI102_ENGINE_DESIGN.md`'s execution flow calls into: the scheduler,
validation rules, and caching strategy — the "how a batch is actually processed" layer.

## Computation Engine

`contracts/computation-engine.interface.ts`:

- **`ComputationScheduler.buildPlan(rootRequests)`** — takes one or more
  `IndicatorExecutionRequest`s (a batch, per `IndicatorEngine.executeBatch()`) and produces a
  `ComputationPlan`: a dependency-graph-resolved `executionOrder`, plus `parallelizableGroups`
  — steps with no dependency relationship to each other, a real opportunity a Phase 2+
  implementation *may* exploit (e.g. via `Promise.all` over one group before moving to the
  next), not a guarantee this contract itself makes.
- **`ComputationScheduler.executePlan(plan)`** — runs the plan, returning both `succeeded` and
  `failed` results separately. **Partial failure is a normal, expected outcome**, not an
  exceptional one — the 10,000-indicator "large watchlist" scenario (Phase 1's own performance
  goals, `AI102_PHASE1_ARCHITECTURE.md` Section 7) will realistically have some individual
  failures at that scale (a bad parameter on one request, a data gap for one instrument), and a
  caller needs the results that *did* succeed, not an all-or-nothing failure that discards 9,999
  good results because 1 failed.

## Error Propagation

`ComputationError.isFatal` is the one real design decision this phase names without deciding
generically: whether one failure aborts everything downstream of it, or is isolated. This is
necessarily a **per-case** decision a real Phase 2+ implementation makes, not a global rule:

- A dependency failure (an EMA that MACD needs fails to calculate) is fatal *for MACD and
  anything depending on MACD* — but not fatal for an unrelated indicator in the same batch.
- A single instrument's data gap failing one indicator in a 100-instrument scan is isolated —
  the other 99 instruments' results are still useful and should be returned.

This phase deliberately does not attempt to encode a general "is X fatal" rule, since the
correct answer depends on the actual dependency relationship between the failed step and
whatever else is in the same plan — exactly what `ComputationPlan.executionOrder` (derived from
the dependency graph) already knows, and what a real scheduler implementation consults live
rather than a static rule table could.

## Incremental Calculation, Deep Dive

The 4 update kinds (`IncrementalUpdateEvent`, `contracts/incremental-calculation.interface.ts`),
and what each one actually triggers:

| Event kind | Trigger | Effect |
|---|---|---|
| `new_candle` | A new candle closes | `IncrementalIndicator.applyIncrementalUpdate()` — append-only, cheapest case |
| `updated_candle` | The current (still-forming) candle revises | Same as `new_candle` — the latest point is recomputed, nothing before it |
| `historical_correction` | AI-101's `HistoricalImportService.createCorrection()` (ADR-022) | Coarse invalidation — `IndicatorResultCache.invalidateByInstrument()`, not a precise "only these points are wrong" calculation (see `AI102_ENGINE_DESIGN.md`'s "Incremental Path" section for why this is a deliberate simplification, not an oversight) |
| `partial_recalculation` | An explicit operator/caller request for a specific range (e.g. after discovering a normalization bug retroactively affecting a known window) | Full `Indicator.calculate()` over exactly the named range, not incremental at all — "partial" refers to the range being less than full history, not to the calculation method |

`IndicatorMetadata.supportsIncrementalCalculation` is the gate: an indicator that hasn't
implemented `IncrementalIndicator` always takes the full-recalculation path regardless of event
kind, which is a legitimate, honest design for a genuinely stateful indicator (this phase's own
`AI102_ENGINE_DESIGN.md` framing) — not every indicator needs to or should force itself into an
incremental shape.

## Validation Rules

`contracts/validation.interface.ts`'s `IndicatorValidator`, and exactly what each check catches:

| Check | Catches |
|---|---|
| `validateParameters` | A required parameter missing; a value outside its declared `min`/`max`/`enum` constraint (e.g. RSI period ≤ 0) |
| `validateLookback` | Fewer candles supplied than `IndicatorMetadata.requiredLookback` — the concrete mechanism preventing a 200-period SMA from silently computing a garbage value off 50 candles |
| `validateDependencies` | A `metadata.dependencies` entry naming an identifier no longer registered (e.g. deregistered between when a composite indicator was built and when it's executed) |
| `validateTimeframe` | A requested timeframe not in `metadata.supportedTimeframes` — including, concretely, any attempt to request 2m/3m/4m (`AI102_PHASE1_ARCHITECTURE.md` Section 5's named gap) against an indicator that (correctly) never declared support for a timeframe AI-101 can't supply |

All 4 checks run *before* any candle is fetched (`AI102_ENGINE_DESIGN.md`'s execution flow,
step 2) — rejecting a bad request cheaply, before spending an AI-101 query on it.

## Caching Strategy

`contracts/cache.interface.ts`'s `IndicatorResultCache` — designed, not implemented (item 12's
explicit instruction). Two implementations anticipated for Phase 2+, both satisfying the same
interface so nothing above the cache layer needs to know which is active:

1. **In-memory** — the first, simplest implementation, same honesty-scoped precedent as
   AI-101's `MarketDataMetricsService`: real for a single running instance, not shared across a
   horizontally-scaled deployment.
2. **Distributed (future)** — reusing the platform's existing Redis dependency (no new
   infrastructure dependency, per this project's standing "reuse platform capabilities" rule),
   for when single-instance caching becomes insufficient.

**Cache key** (`IndicatorResultCacheKey`) includes `indicatorVersion` deliberately — a cached
result computed by v1.0.0 of an indicator must never be served once that indicator's logic
changes to v1.1.0, even for the identical instrument/timeframe/parameters. **Invalidation** has
two granularities: single-key (`invalidate`, for a version bump or a narrowly-scoped
correction) and by-instrument (`invalidateByInstrument`, the coarse default for historical
corrections, per the Incremental Calculation section above).

---

## Phase 2B Update — Real Execution Pipeline

The execution flow described throughout this document is now real — see
`docs/rmsm-ai/AI102_PHASE2B.md` for the full account, including the real end-to-end execution
flow diagram and the honest, tested outcome that no real indicator can execute successfully yet
(every one fails cleanly at the calculation-factory step, by design).

**One structural change from what's described above**: `IndicatorContext` (referenced
throughout this doc's caching/incremental-calculation sections) is now `ExecutionContext` — a
richer, 9-field object (execution id, indicator instance, indicator definition, market data
reference, timeframe, parameters, calculation window, execution timestamp, metadata), still
carrying `candles`/`dependencyResults` in the same shape as before, just within a larger
container. `Indicator.calculate()`'s signature changed to match.

---

## Phase 2C Update — Real Dependency Resolution & Execution Planning

`DependencyResolverService` (item 2) and `ExecutionPlannerService` (item 3) are now real —
genuine transitive resolution, missing-dependency detection, and immutable `ExecutionPlan`
generation with a real, computed Execution Complexity Estimate. See `docs/rmsm-ai/AI102_PHASE2C.md`
for the full account, including a cross-phase inaccuracy this phase caught and fixed:
`ComputationEngineService`'s (Phase 2B) own error message for a dependency-bearing indicator
said dependency execution was "Phase 2C's job, not available yet" — now that Phase 2C's real
infrastructure exists, that message was stale and has been corrected to describe the actual
remaining gap (the infrastructure exists; it isn't wired into the engine yet, a genuine Phase
3+ task).


