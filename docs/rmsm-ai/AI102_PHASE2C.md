# AI-102 — Phase 2C: Dependency Graph & Execution Planning

Status: Complete — Awaiting Architecture Review Before Phase 3

The dependency graph layer, real for the first time — genuine topological sorting, genuine
cycle detection (correctly distinguishing cycles from legitimate diamond dependencies), and a
real execution planner producing immutable plans with a real, computed complexity estimate. No
real indicator calculations exist yet; that limitation is unchanged from Phase 2B and remains
structural, not incidental.

## Architecture Decisions

### `DependencyGraph` restructured again — a richer, immutable model
Phase 1's `DependencyGraph` was a thin pair of methods over plain identifier strings. This
phase's own item 1 wants real nodes, edges, metadata, a graph version, and validation — genuinely
richer. The same category of flagged restructuring as Phase 2A's `IndicatorMetadata` split and
Phase 2B's `IndicatorContext` → `ExecutionContext`: `DependencyGraph` is now an immutable object
with real `DependencyNode[]`/`DependencyEdge[]`, built by `DependencyGraphBuilderService` from
the registry, never constructed by hand.

### "Dependency type" and "optional/required" consolidated into one field
Item 7 lists these as two separate metadata bullets, but they describe the same axis —
`DependencyType = "required" | "optional"` alone captures both, rather than adding a second,
redundant boolean that could disagree with the type itself. Flagged rather than silently
duplicated.

### Graph-layer validation doesn't check timeframes or indicator support — and says so
Item 6 lists "unsupported indicators" and "unsupported timeframes" among the graph validator's
checks. A `DependencyNode` carries only an identifier and version, by design — no timeframe data
exists anywhere on a graph to validate. Rather than fabricate a check against data the graph
doesn't carry (validation theater), `GraphValidatorService`'s own header comment explains
plainly that both concerns are already checked correctly at the registry (Phase 2A) and
execution (Phase 2B) layers, and implements the 5 checks that genuinely are graph-layer concerns
for real.

### A real, cross-phase inaccuracy caught and fixed
`ComputationEngineService`'s (Phase 2B) own error message for an indicator with dependencies
said "dependency execution is Phase 2C's job, not available in this engine yet." Now that Phase
2C's real infrastructure exists, that message was stale — caught while finishing this phase's
own verification, fixed to accurately describe the actual state: the infrastructure exists
(`DependencyResolverService`, `ExecutionPlannerService`), it simply isn't wired into
`ComputationEngineService` yet, which remains a genuine Phase 3+ integration task. The
corresponding test assertion was updated to match, not left checking stale text.

## Dependency Resolution Flow

See `AI102_DEPENDENCY_GRAPH.md` for the full account, including the real institutional_structure
dependency tree built from this project's own actual proprietary indicator data.

## Execution Planning Flow

See `AI102_EXECUTION_PLAN.md` for the full account, including how the recommended Execution
Complexity Estimator is computed for real.

## Assumptions

- A `DependencyGraph` is rebuilt from scratch on each `DependencyGraphBuilderService.build()`
  call — no incremental update exists yet (a real, named extension point,
  `IncrementalGraphUpdater`, item 13). At 28 definitions this is fast; a real concern only at
  much larger scale.
- `ExecutionPlannerService.createPlan()` always plans against the graph's own node versions
  (the registry's latest) — `IndicatorRequest.version`'s "specific version" option is accepted
  by the contract but not yet honored by the real implementation, a named gap in
  `AI102_EXECUTION_PLAN.md`.

## Deferred Work

- Wiring `ExecutionPlan`'s `executionOrder` into real `ExecutionRequest`s and actually running
  them through `ExecutionSchedulerService`/`ComputationEngineService` — the concrete integration
  that would let an indicator WITH dependencies actually execute, once real `calculate()`
  implementations also exist. Neither exists yet; both are genuine Phase 3+ prerequisites.
- `GraphEvent` contracts (item 11) are real types with no publisher, matching Phase 2B's
  `ExecutionEvent`'s identical honest scoping.
- Distributed graph execution, execution-plan caching, incremental graph updates (item 13) — real
  interfaces, no implementation, per that item's own explicit instruction.

## Phase 3 Prerequisites

1. Wire `ComputationEngineService` to actually consume an `ExecutionPlan` for an indicator with
   dependencies — resolving each step's own `ExecutionContext.dependencyResults` from the
   already-executed steps before it in the plan's own order.
2. At least one real `Indicator.calculate()` implementation registered via
   `IndicatorFactoryService`, to prove a dependency-bearing execution succeeds end to end (this
   phase's own tests prove the PLAN is correct; Phase 2B's tests prove a leaf indicator's
   EXECUTION works with a stub `calculate()`; nothing yet proves both together for a real
   dependent indicator like MACD).
3. The 2m/3m/4m timeframe gap (`AI102_PHASE1_ARCHITECTURE.md` Section 5) remains open and
   unaffected by this phase.

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors, first attempt |
| New tests (48 cases across 7 files) | ✅ Genuinely executed — including a real end-to-end test building a graph from Phase 2A's actual 28 definitions and verifying every real dependency chain sorts correctly |
| Full suite | ✅ 54/54 suites, 376/376 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before Phase 3.**
