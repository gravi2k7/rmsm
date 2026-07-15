# AI-102 — Service Architecture

## The Single Public Entry Point

This phase's own explicit recommendation, implemented literally: **`IndicatorEngineServiceImpl`
is the only class any future module (AI-103, AI-104, AI-105, AI-106, AI-109, per this phase's
own architecture diagram) should ever import from AI-102.**

```
                    Future modules (AI-103+)
                            │
                            ▼
                 IndicatorEngineServiceImpl   ← the single public entry point
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
IndicatorQueryServiceImpl  IndicatorExecutionServiceImpl  IndicatorValidationServiceImpl
        │                   │
        ▼                   ▼
IndicatorRegistryService   DependencyGraphBuilderService
(Phase 2A)                 GraphValidatorService
                            ExecutionPlannerService         (Phase 2C)
                            ComputationEngineService        (Phase 2B)
```

`IndicatorEngineServiceImpl` itself contains no orchestration logic beyond delegation and
lifecycle bracketing — the real work lives in the three services below it, each independently
testable. This split matters for a real reason, not just tidiness: `IndicatorExecutionServiceImpl`
(the one with genuine complexity — walking a multi-step plan, resolving dependencies as it goes)
has its own dedicated, thorough test suite; the facade's own tests only need to confirm
delegation happens correctly, not re-prove the orchestration logic underneath it.

## `ExecutionFacade` and `IndicatorEngineService` Are One Interface, Not Two

Item 6 ("create a single façade") and item 1 ("Indicator Engine Service") describe the same
architectural role from two angles in this phase's own spec. Declaring them as two separate
interfaces — one of which `IndicatorEngineServiceImpl` would then also implement — would invite
exactly the confusion item 6 itself warns against ("future modules should only call
IndicatorEngineService"). Resolved by making `ExecutionFacade` a type alias for
`IndicatorEngineService` (`contracts/service-contracts.interface.ts`), not a second interface.

## Dependency Diagram

```
IndicatorEngineModule
├── registry/           (Phase 2A)
├── engine/              (Phase 2B)
├── dependency-graph/     (Phase 2C)
└── services/               (Phase 3, this addition)
    ├── indicator-query.service.ts        → IndicatorRegistryService, RegistryQueryService
    ├── indicator-validation.service.ts   → IndicatorRegistryService, ServiceMetricsService
    ├── indicator-lifecycle.service.ts    → (no dependencies — pure state machine)
    ├── indicator-execution.service.ts    → IndicatorRegistryService, DependencyGraphBuilderService,
    │                                        GraphValidatorService, ExecutionPlannerService,
    │                                        ComputationEngineService, ServiceMetricsService
    ├── indicator-engine.service.ts       → the 4 services above (the ONLY class that assembles
    │                                        all of them together)
    └── service-metrics.service.ts        → (no dependencies)
```

No circular dependency: `services/` depends on `registry/`, `engine/`, and `dependency-graph/`;
none of those three depend back on `services/`. `IndicatorEngineServiceImpl` is the unique
convergence point.

## Why the Service Layer Stays Transport-Agnostic

Every request/response model (`ExecuteIndicatorRequest`, `IndicatorExecutionResponse`, etc.,
`AI102_SERVICE_API.md`) is a plain, JSON-serializable object — no class instances beyond the
services themselves, no methods on the data shapes. This isn't an accident: "the service layer
must remain independent of transport protocols" (this phase's own architecture rule) means a
future REST controller, GraphQL resolver, or WebSocket handler (item 13's extension points) can
wrap `IndicatorEngineServiceImpl` with essentially no translation layer — the shapes this phase
defines are already what an HTTP body or a GraphQL response would look like.

## Architecture Rules, Verified Structurally

- **"Services orchestrate, they never calculate indicators"** — no service file in `services/`
  imports anything from `indicators/built-in/` or `indicators/proprietary/`; verified by direct
  grep, not just asserted.
- **"Registry remains metadata only"** — `IndicatorQueryServiceImpl` never calls
  `ComputationEngineService`; it only reads from `IndicatorRegistryService`/`RegistryQueryService`.
- **"Dependency graph remains independent"** — `DependencyGraphBuilderService`/`GraphValidatorService`
  are called BY `IndicatorExecutionServiceImpl`, never the reverse; the graph layer has no
  knowledge the service layer exists.
- **"Computation engine remains computation only"** — `ComputationEngineService.execute()`
  (Phase 2B, extended this phase) still does no dependency resolution of its own; it only
  accepts what `IndicatorExecutionServiceImpl` already resolved, per that method's own updated
  contract comment.
