# AI-102 — Execution Plan

## Architecture

`ExecutionPlan` is what `ExecutionPlannerService.createPlan()` produces from a `DependencyGraph`
plus an `IndicatorRequest` — item 8's own field list, exactly:

```
ExecutionPlan
├── planId, graphId
├── executionOrder: ExecutionPlanStep[]   { identifier, version, order }
├── dependencyTree: DependencyTreeNode    (the full nested tree, DependencyResolverService)
├── calculationMode: CalculationMode
├── executionMetadata: { timeoutPolicy, cancellationPolicy }
└── estimatedComplexity: ExecutionComplexityEstimate
```

Immutable — `Object.freeze()`-d (deep) before being returned, the same discipline every other
core object in this engine now follows (`IndicatorDefinition`, `ExecutionContext`,
`ExecutionResult`, `DependencyGraph`).

## Planning Flow

```
IndicatorRequest { indicatorIdentifier: "strategy_indicator", calculationMode: "LIVE_BAR", ... }
    │
    ├─ TopologicalSorterService.sort(graph, "strategy_indicator")
    │     → ["ema", "macd", "strategy_indicator"]
    │
    ├─ Each identifier resolved to its real node version → ExecutionPlanStep[]
    │     (order: 0, 1, 2 — 0-indexed, dependency-respecting)
    │
    ├─ DependencyResolverService.produceDependencyTree(graph, "strategy_indicator")
    │     → the full nested tree
    │
    └─ estimateComplexity(graph, order) → ExecutionComplexityEstimate
```

"No scheduler implementation" (item 3's own words) — a plan is the finished artifact; wiring
its `executionOrder` steps into real `ExecutionRequest`s (Phase 2B) and actually running them
through `ExecutionSchedulerService` remains a genuine, named Phase 3+ integration task, not
attempted this phase.

## Execution Complexity Estimator (The Recommended Addition)

Real and computed, not a placeholder field:

| Field | How it's computed |
|---|---|
| `nodeCount` | The sorted order's own length |
| `dependencyDepth` | Same as `nodeCount` for a single-root plan — every step in a root's own sorted order lies on the path from its deepest dependency to the root itself, by construction |
| `estimatedComputationCost` | `nodeCount × dependencyDepth` — a dimensionless relative score (not milliseconds; no real calculation exists yet to time), letting two plans be meaningfully compared against each other even though neither number alone means "this many milliseconds" |
| `parallelizationOpportunities` | Real groups of steps with no dependency relationship to each other, computed by checking (transitively) whether any two same-tier steps depend on one another — metadata only; nothing in this phase actually parallelizes based on it |

## Calculation Modes

Reuses Phase 2B's `CalculationMode` directly (`FULL_RECALCULATION`, `INCREMENTAL`,
`HISTORICAL_REPLAY`, `LIVE_TICK`, `LIVE_BAR`, `BACKTEST`) — not redeclared. Item 9's own "metadata
only, no execution" instruction is already satisfied by that type's own Phase 2B scoping; this
phase adds nothing new here beyond consuming it in `IndicatorRequest`/`ExecutionPlan`.

## Known Limitations

- `IndicatorRequest.version` (optional, "a specific version or latest") is accepted by the
  contract but `ExecutionPlannerService.createPlan()`'s real implementation always plans against
  whatever version the graph's own nodes carry (the registry's latest, per
  `DependencyGraphBuilderService`) — a real, named gap: honoring a caller's specific version
  request would need the planner to resolve against `DependencyResolverService.resolveVersion()`
  per step, not implemented this phase.
- `parallelizationOpportunities` is a real, computed grouping, but its algorithm is a simple
  greedy assignment (each step joins the first compatible group it finds) — not necessarily the
  OPTIMAL parallelization grouping, which is a harder combinatorial problem. Good enough for
  metadata purposes (item 3's own framing); not claimed as optimal.
