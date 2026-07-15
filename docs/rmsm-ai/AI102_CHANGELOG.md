# Changelog — AI-102: Indicator Engine

## Phase 3 — Indicator Services & Engine Orchestration

### Added
- `contracts/service-models.interface.ts` — request models (`ExecuteIndicatorRequest`, `QueryIndicatorRequest`, `IndicatorValidationRequest`) and response models (`IndicatorExecutionResponse`, `IndicatorMetadataResponse`, `IndicatorListResponse`, `ValidationResponse`, `ExecutionSummary`) — items 8-9
- `contracts/service-contracts.interface.ts` — all 6 service contracts (item 7), with `ExecutionFacade` resolved as an alias for `IndicatorEngineService`
- `contracts/service-event.interface.ts` — 6 named events (item 10), no event bus
- `contracts/service-metrics.interface.ts` — `ServiceMetricsSnapshot` (item 11)
- `contracts/service.errors.ts` — `ServiceError` and 5 named subclasses (item 12)
- `contracts/service-extension-points.interface.ts` — 6 transport/consumer extension points (item 13)
- `services/indicator-query.service.ts` — real `IndicatorQueryServiceImpl` (item 2)
- `services/indicator-validation.service.ts` — real `IndicatorValidationServiceImpl` (item 4)
- `services/indicator-lifecycle.service.ts` — real `IndicatorLifecycleServiceImpl` (item 5)
- `services/indicator-execution.service.ts` — real `IndicatorExecutionServiceImpl` (item 3) — walks a real `ExecutionPlan`, resolving each step's own dependencies
- `services/indicator-engine.service.ts` — real `IndicatorEngineServiceImpl`, **the single public entry point**
- `services/service-metrics.service.ts` — real `ServiceMetricsService`, wired into both execution and validation
- 35 new tests across 6 spec files, all genuinely executed — including a real end-to-end test proving a MACD-shaped dependency-bearing indicator executes correctly, receiving its EMA dependency's real computed result

### Changed
- `engine/computation-engine.service.ts` — `execute()` extended with an optional `resolvedDependencyResults` parameter, closing the exact Phase 2C prerequisite this project's own docs named
- `engine/__tests__/computation-engine.service.spec.ts` — updated/added tests for the new parameter, including a genuine success case for a dependency-bearing indicator
- `contracts/computation-engine-orchestrator.interface.ts` — updated to match
- `indicator-engine.module.ts` — 6 new Phase 3 providers wired in; `IndicatorEngineServiceImpl` now exported as the primary surface
- `docs/rmsm-ai/AI102_ENGINE_DESIGN.md`, `AI102_COMPUTATION_PIPELINE.md` — Phase 3 updates appended

### Bugs Found and Fixed During This Phase's Own Verification
1. Two real test bugs in the ComputationEngineService integration test (a grammar mismatch in
   an assertion, and a missing required parameter on a test fixture) — both caught by actually
   running the tests, not just writing them.
2. A real TypeScript strictness error (chained optional access on a doubly-optional field) in a
   new test file — caught by `tsc`.
3. A real unused-import lint error.

---

## Phase 2C — Dependency Graph & Execution Planning

### Added
- `contracts/dependency-node.interface.ts` — `DependencyNode`
- `contracts/dependency-edge.interface.ts` — `DependencyEdge`, `DependencyType`
- `contracts/dependency-resolver.interface.ts` — `DependencyResolver`, `DependencyTreeNode`
- `contracts/execution-plan.interface.ts` — `ExecutionPlan`, `ExecutionComplexityEstimate` (the recommended Execution Complexity Estimator)
- `contracts/execution-planner.interface.ts` — `ExecutionPlanner`, `IndicatorRequest`
- `contracts/graph-validator.interface.ts` — `GraphValidator` (item 6, 7 checks)
- `contracts/graph-metrics.interface.ts` — `GraphMetrics` (item 10)
- `contracts/graph-event.interface.ts` — 6 named events (item 11), no event bus
- `contracts/graph.errors.ts` — `GraphError` and 6 named subclasses (item 12)
- `contracts/graph-extension-points.interface.ts` — 3 new graph-specific extension points (item 13)
- `dependency-graph/dependency-graph-builder.service.ts` — real, builds an immutable graph from the registry
- `dependency-graph/cycle-detector.service.ts` — real DFS-based cycle detection
- `dependency-graph/topological-sorter.service.ts` — real Kahn's-algorithm topological sort
- `dependency-graph/graph-validator.service.ts` — real implementation of all applicable checks
- `dependency-graph/dependency-resolver.service.ts` — real implementation of all 5 responsibilities
- `dependency-graph/graph-metrics.service.ts` — real metrics computation
- `dependency-graph/execution-planner.service.ts` — real plan generation with real complexity estimation
- 48 new tests across 7 spec files, all genuinely executed — including a real end-to-end test
  building a graph from Phase 2A's actual 28 registered definitions and verifying every real
  dependency chain (SuperTrend→ATR, MACD→EMA, Keltner→ATR+EMA, Institutional Structure's 4-way
  proprietary chain) sorts correctly

### Changed
- `contracts/dependency-graph.interface.ts` — rewritten: immutable graph with real nodes/edges/metadata, superseding Phase 1's simple identifier-string model
- `indicator-engine.module.ts` — 7 new Phase 2C providers wired in
- `engine/computation-engine.service.ts` — stale "Phase 2C's job" error message corrected now that Phase 2C's real infrastructure exists
- `engine/__tests__/computation-engine.service.spec.ts` — updated assertion to match the corrected message
- `docs/rmsm-ai/AI102_ENGINE_DESIGN.md`, `AI102_COMPUTATION_PIPELINE.md` — Phase 2C updates appended

### Bugs / Inaccuracies Found and Fixed During This Phase's Own Verification
1. `ComputationEngineService`'s own error message became stale the moment Phase 2C's real
   infrastructure was built — caught and corrected during this same phase's verification, not
   left for a later cleanup pass.
2. An unused `placed` variable (written but never read) in `ExecutionPlannerService`'s
   parallelization-grouping logic — removed.
3. A `void` hack silencing an unused-constant lint error in `GraphValidatorService`'s first
   draft — removed in favor of simply not declaring the unused constant.

---

## Phase 2B — Computation Infrastructure

### Added
- `contracts/calculation-window.interface.ts` — `CalculationMode` (6-variant enum, the
  recommended addition), `CalculationWindow`
- `contracts/execution-context.interface.ts` — `ExecutionContext` (supersedes `IndicatorContext`)
- `contracts/execution-request.interface.ts` — `ExecutionRequest`, `ExecutionOptions`
- `contracts/indicator-lifecycle.interface.ts` — `IndicatorLifecycleState`, real `LIFECYCLE_TRANSITIONS` table
- `contracts/execution-result.interface.ts` — `ExecutionResult` (distinct from `IndicatorResult`)
- `contracts/execution-metrics.interface.ts` — `ExecutionMetrics`
- `contracts/execution.errors.ts` — `ExecutionError` and 7 named subclasses (item 10)
- `contracts/execution-event.interface.ts` — 5 named events (item 11), no event bus
- `contracts/execution-validator.interface.ts` — `ExecutionValidator` (item 8, 7 checks)
- `contracts/computation-engine-orchestrator.interface.ts` — `ComputationEngine` (item 1)
- `contracts/execution-scheduler.interface.ts` — `ExecutionScheduler` (item 5)
- `contracts/extension-points.interface.ts` — 6 future extension point interfaces (item 12)
- `registry/indicator-factory.service.ts` — real `IndicatorFactoryService`, genuinely empty of calculation builders
- `engine/execution-lifecycle-tracker.ts` — real state machine
- `engine/execution-metrics.service.ts` — real timing/aggregate collector
- `engine/execution-validator.service.ts` — real implementation of all 7 checks
- `engine/computation-engine.service.ts` — real orchestrator, first real AI-101 integration point
- `engine/execution-scheduler.service.ts` — real sequential scheduler
- 33 new tests across 5 spec files, all genuinely executed — including a real end-to-end test
  proving every current indicator fails cleanly and honestly at the calculation-factory step

### Changed
- `contracts/indicator.interface.ts` — `calculate()` parameter type changed from
  `IndicatorContext` to `ExecutionContext`
- `contracts/computation-engine.interface.ts` — scope note added distinguishing it (Phase 2C,
  dependency-graph-aware batch scheduling) from this phase's new, simpler contracts
- `indicator-engine.module.ts` — imports `MarketDataModule`; all Phase 2B services wired in
- `docs/rmsm-ai/AI102_COMPUTATION_PIPELINE.md`, `AI102_ENGINE_DESIGN.md` — Phase 2B updates appended

### Bugs Found and Fixed During This Phase's Own Verification
1. `LIFECYCLE_TRANSITIONS` didn't allow `READY → FAILED`, even though the real engine's own
   control flow can fail in exactly that gap — caught while writing the engine's error-handling
   path, not in a separate review.
2. A real unused-import lint error in the computation engine's own test file.

---

## Phase 2A — Indicator Registry & Definitions

### Added
- `contracts/parameter-definition.interface.ts` — `ParameterDefinition` (8-variant discriminated union: integer, decimal, boolean, enum, string, timeframe, symbol, date)
- `contracts/indicator-definition.interface.ts` — `IndicatorDefinition` (the full, immutable, top-level object)
- `contracts/registry-validation.errors.ts` — `RegistryValidationError` and 7 named subclasses (item 8)
- `contracts/registry-validator.interface.ts` — `RegistryValidator`
- `contracts/registry-query.interface.ts` — `RegistryQuery`, `IndicatorDiscoveryFilter`
- `contracts/indicator-instance.interface.ts` — `IndicatorInstance` (mutable runtime counterpart to `IndicatorDefinition`)
- `registry/indicator-registry.service.ts` — real `IndicatorRegistryService` (version management, deep-freeze immutability enforcement)
- `registry/registry-validator.service.ts` — real `RegistryValidatorService` (all 7 checks from item 8)
- `registry/registry-query.service.ts` — real `RegistryQueryService`
- `registry/indicator-instance.ts` — real, mutable `IndicatorInstance` class
- `registry/indicator-definition-registrar.service.ts` — startup registration of all 28 named indicators
- `indicators/definition-helpers.ts` — shared parameter/timeframe builders
- `indicators/built-in/trend.definitions.ts` (9), `momentum.definitions.ts` (4),
  `volatility.definitions.ts` (4), `volume.definitions.ts` (2) — 19 built-in indicator definitions
- `indicators/proprietary/proprietary.definitions.ts` — 9 proprietary indicator definitions (11 objects, RDSE at 3 versions)
- `indicator-engine.module.ts` — first real NestJS module for this engine
- 48 new tests across 5 spec files, all genuinely executed — including a real end-to-end
  registrar test that caught and proved the fix for a genuine registration-order bug

### Changed
- `contracts/indicator-metadata.interface.ts` — narrowed to calculation-characteristic flags only (documentation, calculationType, deterministic, cacheable, incrementalSupport), embedded within `IndicatorDefinition` rather than standing alone
- `contracts/indicator.interface.ts` — `metadata` field renamed to `definition: IndicatorDefinition`
- `contracts/indicator-registry.interface.ts` — returns `IndicatorDefinition`; added version management methods (`getVersion`, `listVersions`, `listByTag`)
- `contracts/validation.interface.ts` — updated to reference `IndicatorDefinition`; added a note distinguishing it from the new `RegistryValidator`
- `apps/api/src/app.module.ts` — `IndicatorEngineModule` wired in
- `docs/rmsm-ai/AI102_INDICATOR_REGISTRY.md` — Phase 2A implementation update appended

### Bugs Found and Fixed During This Phase's Own Verification
1. A registration-order dependency bug (`keltner_channel`/`supertrend` crossing category-file
   boundaries) — caught by a real end-to-end test, not by inspection.
2. `incrementalSupport` dropped entirely during the `IndicatorMetadata` restructuring, despite
   item 6 explicitly naming it — caught while implementing the capability-filter discovery query.
3. A TypeScript strictness error (`Partial<Record<...>>` spread allowing `undefined` into a
   non-optional `Record`) in `IndicatorInstance` — caught by `tsc`.

---

## Phase 1 — Architecture & Engineering Specification

### Added
- `apps/api/src/modules/indicator-engine/` — full folder structure (10 directories); `contracts/`
  and `dto/` populated, the other 7 marked deferred with explanatory READMEs
- `contracts/indicator-category.enum.ts` — the 8 named categories
- `contracts/timeframe.ts` — `IndicatorTimeframe` (reuses AI-101's `CandleInterval`), plus the
  2m/3m/4m gap documented in machine-readable form
- `contracts/indicator-metadata.interface.ts` — `IndicatorMetadata`, `IndicatorInputSpec`,
  `IndicatorOutputSpec`
- `contracts/indicator-result.interface.ts` — `IndicatorResult`, `IndicatorResultPoint`
- `contracts/indicator-context.interface.ts` — `IndicatorContext`
- `contracts/indicator.interface.ts` — the core `Indicator` interface (built-in, proprietary,
  and composite indicators alike)
- `contracts/indicator-factory.interface.ts` — `IndicatorFactory`
- `contracts/indicator-registry.interface.ts` — `IndicatorRegistry`
- `contracts/indicator-execution.interface.ts` — `IndicatorExecutionRequest`/`Result`
- `contracts/indicator-engine.interface.ts` — `IndicatorEngine`, the single public entry point
- `contracts/dependency-graph.interface.ts` — `DependencyGraph`, cycle detection
- `contracts/incremental-calculation.interface.ts` — `IncrementalUpdateEvent`,
  `IncrementalIndicator`
- `contracts/validation.interface.ts` — `IndicatorValidator`, standardized error model
  (`IndicatorValidationError` and 4 named subclasses)
- `contracts/cache.interface.ts` — `IndicatorResultCache` (designed, not implemented)
- `contracts/computation-engine.interface.ts` — `ComputationScheduler`, `ComputationPlan`
- `dto/indicator-execution-request.dto.ts` — `IndicatorExecutionRequestDto`
- 7 documentation files under `docs/rmsm-ai/`: `AI102_PHASE1_ARCHITECTURE.md`,
  `AI102_ENGINE_DESIGN.md`, `AI102_INDICATOR_REGISTRY.md`, `AI102_COMPUTATION_PIPELINE.md`,
  `AI102_PHASE2_PLAN.md`, `AI102_CHANGELOG.md` (this file),
  `AI102_PHASE1_FILES_CHANGED.md`

### Architectural Decisions
- No Prisma schema changes this phase — indicator definitions are code (registered like AI-101's
  own providers), not data; computed values are a deferred caching concern; justified at length
  in `AI102_PHASE1_ARCHITECTURE.md` Section 6.
- `IndicatorTimeframe` reuses AI-101's `CandleInterval` directly — surfaced a real gap (no
  2m/3m/4m support anywhere in AI-101), documented rather than silently assumed covered.
- Proprietary indicators use the identical `Indicator` interface as built-in ones — no special
  case anywhere in any contract.
