# Changelog — AI-102: Indicator Engine

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
