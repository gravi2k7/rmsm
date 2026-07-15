# AI-102 Phase 2A — Files Changed

## Created (25 files)

**Contracts (6 new)**
- `apps/api/src/modules/indicator-engine/contracts/parameter-definition.interface.ts`
- `apps/api/src/modules/indicator-engine/contracts/indicator-definition.interface.ts`
- `apps/api/src/modules/indicator-engine/contracts/registry-validation.errors.ts`
- `apps/api/src/modules/indicator-engine/contracts/registry-validator.interface.ts`
- `apps/api/src/modules/indicator-engine/contracts/registry-query.interface.ts`
- `apps/api/src/modules/indicator-engine/contracts/indicator-instance.interface.ts`

**Registry implementation (5 new)**
- `apps/api/src/modules/indicator-engine/registry/indicator-registry.service.ts`
- `apps/api/src/modules/indicator-engine/registry/registry-validator.service.ts`
- `apps/api/src/modules/indicator-engine/registry/registry-query.service.ts`
- `apps/api/src/modules/indicator-engine/registry/indicator-instance.ts`
- `apps/api/src/modules/indicator-engine/registry/indicator-definition-registrar.service.ts`

**Indicator definitions (6 new)**
- `apps/api/src/modules/indicator-engine/indicators/definition-helpers.ts`
- `apps/api/src/modules/indicator-engine/indicators/built-in/trend.definitions.ts`
- `apps/api/src/modules/indicator-engine/indicators/built-in/momentum.definitions.ts`
- `apps/api/src/modules/indicator-engine/indicators/built-in/volatility.definitions.ts`
- `apps/api/src/modules/indicator-engine/indicators/built-in/volume.definitions.ts`
- `apps/api/src/modules/indicator-engine/indicators/proprietary/proprietary.definitions.ts`

**Module (1 new)**
- `apps/api/src/modules/indicator-engine/indicator-engine.module.ts`

**Tests (5 new)**
- `apps/api/src/modules/indicator-engine/registry/__tests__/indicator-registry.service.spec.ts`
- `apps/api/src/modules/indicator-engine/registry/__tests__/registry-validator.service.spec.ts`
- `apps/api/src/modules/indicator-engine/registry/__tests__/registry-query.service.spec.ts`
- `apps/api/src/modules/indicator-engine/registry/__tests__/indicator-instance.spec.ts`
- `apps/api/src/modules/indicator-engine/registry/__tests__/indicator-definition-registrar.service.spec.ts`

**Documentation (2 new)**
- `docs/rmsm-ai/AI102_PHASE2A.md`
- `docs/rmsm-ai/AI102_PHASE2A_FILES_CHANGED.md` (this file)

## Modified (7 files)

- `apps/api/src/modules/indicator-engine/contracts/indicator-metadata.interface.ts` — narrowed
  to calculation-characteristic flags, embedded within the new `IndicatorDefinition`
- `apps/api/src/modules/indicator-engine/contracts/indicator.interface.ts` — `metadata` field
  renamed to `definition: IndicatorDefinition`
- `apps/api/src/modules/indicator-engine/contracts/indicator-registry.interface.ts` — rewritten
  to return `IndicatorDefinition`; added version management methods
- `apps/api/src/modules/indicator-engine/contracts/validation.interface.ts` — updated to
  `IndicatorDefinition`; added a note distinguishing it from `RegistryValidator`
- `apps/api/src/modules/indicator-engine/contracts/dependency-graph.interface.ts`,
  `incremental-calculation.interface.ts`, `indicator-context.interface.ts`,
  `indicator-execution.interface.ts` — stale `IndicatorMetadata`/`requiredLookback` comment
  references updated (no functional/type change, comment accuracy only)
- `apps/api/src/app.module.ts` — `IndicatorEngineModule` wired in
- `docs/rmsm-ai/AI102_INDICATOR_REGISTRY.md` — Phase 2A implementation update appended
- `docs/rmsm-ai/AI102_CHANGELOG.md` — Phase 2A section prepended

## Deleted (2 files)

- `apps/api/src/modules/indicator-engine/registry/README.md` — deferral marker, removed now
  that this directory has real implementation
- `apps/api/src/modules/indicator-engine/indicators/README.md` — deferral marker, removed now
  that this directory has real definition metadata

## Not Touched

Zero AI-101 files, zero EP module files, zero `schema.prisma` change (unchanged from Phase 1's
own justification — still no persistence need this phase). No indicator calculation logic
(`Indicator.calculate()` remains unimplemented for every definition), no controllers, no
caching, no dependency-graph execution — per this phase's explicit scope.
