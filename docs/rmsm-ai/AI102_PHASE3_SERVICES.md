# AI-102 — Phase 3: Indicator Services & Engine Orchestration

Status: Complete — Awaiting Architecture Review Before Phase 4

The service layer, real for the first time — and the phase where AI-102's full pipeline finally
connects end to end. A dependency-bearing indicator can now genuinely execute through this
engine, verified by a real test using a MACD-shaped indicator that actually receives its EMA
dependency's real computed result.

## Architecture Decisions

### `ExecutionFacade` and `IndicatorEngineService` resolved as one interface
Item 6 and item 1 describe the same role from two angles. `ExecutionFacade` is a type alias for
`IndicatorEngineService`, not a second interface — `AI102_SERVICE_ARCHITECTURE.md` has the full
reasoning.

### `ComputationEngineService.execute()` extended to accept pre-resolved dependencies
The single most important change this phase makes to existing code. Phase 2B's
`ComputationEngineService` hard-rejected any indicator with dependencies, with a message
correctly noting dependency resolution "is Phase 2C's job, not available in this engine yet."
That was accurate at the time, and became the exact "Phase 3 prerequisite" this project's own
Phase 2C docs named. This phase adds an optional `resolvedDependencyResults` parameter — the
method still resolves nothing itself (it only accepts what's already been resolved, and still
fails clearly if something required is missing), but a caller that HAS already resolved every
dependency (`IndicatorExecutionServiceImpl`, walking a real `ExecutionPlan`) can now supply them
and get a genuine `COMPLETED` result. Both the contract (`computation-engine-orchestrator.interface.ts`)
and the existing Phase 2B test suite were updated to match — not left stale.

### Only the root step honors caller-supplied parameters; dependencies use their own defaults
A real, flagged limitation: executing MACD today always uses EMA's own registered default
parameters (period 20) for both the fast and slow leg — Phase 1's own worked example (MACD
depending on two DIFFERENTLY-parameterized EMA instances) isn't fully realized yet, since this
phase's `IndicatorExecutionServiceImpl` walks one `ExecutionPlanStep` per unique identifier, not
per differently-configured instance. A real, named Phase 4+ need: per-step parameter overrides
within one execution plan.

### Validation reports every problem, not just the first
`IndicatorValidationServiceImpl.validate()` deliberately does NOT fail fast, unlike
`RegistryValidatorService`/`GraphValidatorService` (which do, correctly, for their own
registration/graph-build contexts). A caller's request validation is different: seeing every
problem at once (a missing parameter AND an unsupported timeframe, say) is more useful than
fixing one, resubmitting, and discovering the next.

## Orchestration Flow

```
IndicatorEngineServiceImpl.execute(request)
    │
    ├─ IndicatorLifecycleServiceImpl.markExecuting()
    │
    ├─ IndicatorExecutionServiceImpl.execute(request)
    │     │
    │     ├─ DependencyGraphBuilderService.build()          (Phase 2C)
    │     ├─ GraphValidatorService.validate(graph)           (Phase 2C)
    │     ├─ ExecutionPlannerService.createPlan(graph, ...)  (Phase 2C)
    │     │
    │     └─ for each step in plan.executionOrder (dependency-first):
    │           ├─ resolve THIS step's own dependencies from already-completed steps
    │           ├─ ComputationEngineService.execute(stepRequest, resolvedDeps)  (Phase 2B)
    │           └─ if not COMPLETED: abort, return partial results + errors
    │
    └─ IndicatorLifecycleServiceImpl.markReady()  (always, even on failure — a `finally` block)
```

See `AI102_SERVICE_ARCHITECTURE.md` for the full dependency diagram and
`AI102_SERVICE_API.md` for the complete callable surface.

## Assumptions

- Every step in one execution plan runs against the SAME `instrumentId` as the root request — a
  future relative-strength-style indicator wanting a different instrument for one of its own
  dependencies isn't supported.
- `ServiceMetricsService` is real and wired into both `IndicatorExecutionServiceImpl` and
  `IndicatorValidationServiceImpl` — every field on `ServiceMetricsSnapshot` is populated by a
  real call site, not left declared-but-unused.

## Deferred Work

- Real `Indicator.calculate()` implementations — still zero, for any of the 28 registered
  definitions. This phase makes the ORCHESTRATION real; the arithmetic remains entirely absent,
  by design.
- REST controllers, GraphQL resolvers, WebSocket handlers — real extension-point interfaces
  exist (item 13), no implementation.
- Per-step parameter overrides within one execution plan (see "Architecture Decisions" above).
- `ServiceEvent` contracts (item 10) — real types, no publisher, matching every prior phase's
  identical honest scoping for its own event contracts.

## Phase 4 Prerequisites

1. At least one real `Indicator.calculate()` implementation (SMA or EMA are the simplest
   candidates, per `AI102_PHASE2_PLAN.md`'s own original proposal) — this phase's own test suite
   proves the orchestration is ready the moment one exists.
2. A decision on per-step parameter overrides for dependency-bearing plans (this phase's own
   named limitation).
3. The 2m/3m/4m timeframe gap (`AI102_PHASE1_ARCHITECTURE.md` Section 5) remains open.

## Verification

| Check | Result |
|---|---|
| `pnpm lint` (`@rmsm/api`) | ✅ 0 errors — 1 real unused-import error found and fixed |
| `pnpm typecheck` (`@rmsm/database`, `@rmsm/api`) | ✅ 0 errors — 1 real strictness error found and fixed |
| New tests (35 cases across 6 files) | ✅ Genuinely executed — including the critical case: a real MACD-shaped indicator receiving its real EMA dependency's computed result through the full plan-walking pipeline |
| Full suite | ✅ 60/60 suites, 411/411 tests |
| TODO/placeholder/bare-`any` scan | ✅ none found |

---

**Awaiting your review before Phase 4.**
