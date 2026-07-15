# Changelog — AI-102: Indicator Engine

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
