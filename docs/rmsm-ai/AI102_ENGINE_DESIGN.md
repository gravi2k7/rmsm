# AI-102 — Engine Design

## Execution Flow, End to End

```
Caller (future AI-103+, or an internal scheduler)
    │
    ▼
IndicatorEngine.execute(IndicatorExecutionRequest)
    │
    ├─ 1. IndicatorRegistry.get(indicatorIdentifier) → IndicatorMetadata
    │
    ├─ 2. IndicatorValidator.validateParameters/validateTimeframe(metadata, request)
    │       — reject early, before any data is fetched, on a bad request
    │
    ├─ 3. DependencyGraph.resolveExecutionOrder(indicatorIdentifier)
    │       — e.g. for a Custom Strategy Indicator depending on MACD depending on
    │         two EMAs: [ema_12, ema_26, macd, custom_strategy_indicator]
    │
    ├─ 4. IndicatorResultCache.get(key) for each step in that order
    │       — skip recomputation for anything already cached and still valid
    │
    ├─ 5. For each uncached step, in dependency order:
    │       a. Fetch candles from AI-101 (MarketDataService.getCandles), covering
    │          requiredLookback before the requested range
    │       b. Assemble IndicatorContext (candles + already-computed dependencyResults
    │          from earlier steps in this same execution)
    │       c. IndicatorValidator.validateLookback(metadata, candles.length)
    │       d. Indicator.calculate(context) → IndicatorResult
    │       e. IndicatorResultCache.set(key, result)
    │
    └─ 6. Return the root indicator's IndicatorResult wrapped in IndicatorExecutionResult
            (with durationMs, wasIncremental)
```

Every step above names the exact contract (`contracts/`) responsible — Phase 2's job is
implementing each one, not inventing this flow from scratch.

## Calculation Lifecycle (Per Indicator)

```
Registered (IndicatorRegistry.register() called at startup)
    │
    ▼
Requested (IndicatorExecutionRequest submitted, naming this indicator's identifier)
    │
    ▼
Validated (IndicatorValidator checks pass, or the request is rejected here — never
           reaching calculation with a bad parameter/timeframe/dependency)
    │
    ▼
Dependencies Resolved (DependencyGraph orders this indicator after everything it needs;
                       ComputationScheduler may run independent dependencies in parallel)
    │
    ▼
Context Assembled (candles fetched + covering requiredLookback, dependencyResults collected)
    │
    ▼
Calculated (Indicator.calculate(context) — pure, deterministic, no side effects)
    │
    ▼
Cached (IndicatorResultCache.set(), Phase 2+ once caching is actually implemented)
    │
    ▼
Returned
```

An **incremental** update (Section "Incremental Path" below) skips straight from "Requested" to
a shortened version of "Context Assembled" (only the new/changed candle, not the full lookback
window) when `IndicatorMetadata.supportsIncrementalCalculation` is true and the caller's
`allowIncremental` flag permits it.

## Registration Mechanism

Identical shape to AI-101's own provider registration (Phase 2B), not a new pattern:

```typescript
// Illustrative — Phase 2's actual implementation, not written this phase
indicatorRegistry.register(emaIndicator.metadata);
indicatorFactory.registerBuilder("ema", (params) => new EmaIndicator(params));
```

A future built-in indicator module (Phase 2+) registers itself this way at application startup,
via `OnModuleInit`, the same `ProviderRegistrarService` pattern AI-101 Phase 2B established.
Proprietary indicators (RDSE, Market State Engine, BOS, CHOCH, ...) register through the
identical mechanism — per this phase's own explicit rule, "the engine must treat proprietary
indicators exactly like built-in indicators," there is no separate registration path for them.

## Dependency Graph — Worked Example

This phase's own example (item 7):

```
EMA(12) ─┐
          ├─→ MACD ─→ Custom Strategy Indicator
EMA(26) ─┘
```

`DependencyGraph.resolveExecutionOrder("custom_strategy_indicator")` returns
`["ema_12", "ema_26", "macd", "custom_strategy_indicator"]` — both EMAs before MACD (order
between them doesn't matter, since neither depends on the other — a real
`ComputationPlan.parallelizableGroups` opportunity, `[["ema_12", "ema_26"], ["macd"],
["custom_strategy_indicator"]]`), MACD before the indicator that depends on it.

**Circular dependency prevention**: if a future custom indicator's metadata named a dependency
that (directly or transitively) depends back on itself, `DependencyGraph.detectCycle()` finds
it before `resolveExecutionOrder()` would otherwise loop forever or produce a nonsensical
partial order. This is checked at *registration* time in a real Phase 2 implementation (reject
a self-referential indicator before it's ever registered), not only at execution time — an
architectural intent named here for Phase 2 to implement, not implemented itself this phase.

## Incremental Path

```
New candle arrives (AI-101's HistoricalImportService or a future live-sync mechanism)
    │
    ▼
IncrementalUpdateEvent constructed (kind: "new_candle" | "updated_candle" |
                                    "historical_correction" | "partial_recalculation")
    │
    ▼
For each cached IndicatorResult depending on this instrument/timeframe:
    │
    ├─ if "historical_correction": IndicatorResultCache.invalidateByInstrument()
    │     — a correction can invalidate far more than just the corrected point (e.g. a moving
    │       average's entire subsequent window), so this is a coarse, safe invalidation, not
    │       an attempt to precisely determine exactly which cached values are now wrong
    │
    └─ else, if the indicator implements IncrementalIndicator:
          IncrementalIndicator.applyIncrementalUpdate(previousPoints, event)
          — only the new/changed points, never a full recalculation
       else:
          fall back to a full Indicator.calculate() over the full lookback window
```

The "historical correction invalidates broadly rather than precisely" design choice is
deliberate, not a shortcut: precisely determining exactly which cached indicator values a given
correction invalidates would require each indicator to expose its own "how far forward does a
change at time T propagate" logic — real, indicator-specific complexity (a 200-period SMA
propagates much further than a single-candle oscillator) that this phase's contracts don't
attempt to model, in favor of a safe, coarse default a real Phase 2 implementation can refine
later if the coarse invalidation proves too expensive in practice.
