# Changelog — AI-101: Market Data Management

## Phase 3 — Service Layer & Synchronization Orchestration

### Added
- `services/provider-orchestration.service.ts` — centralized retry + rate-limit policy
  application, in-process (not queued — ADR-029)
- `services/market-data-metrics.service.ts` — metrics hooks (honestly-scoped, same pattern as
  Module 005)
- `services/market-data.service.ts` — the read-side "single source of truth" API
- `services/historical-import.service.ts` — write-side orchestrator (fetch → validate →
  deduplicate → persist, transactionally, with audit + metrics)
- `services/synchronization.service.ts` — sync decision logic, no scheduler
- 22 new unit tests across 4 spec files, all genuinely executed and passing
- `docs/rmsm-ai/AI_101_MARKET_DATA_PHASE_3_SERVICE_LAYER.md`,
  `AI_101_MARKET_DATA_PHASE_3_FILES_CHANGED.md`

### Changed
- `market-data.module.ts` — imports `AuthModule` (for `AuditService`); 5 new services wired in

### Architecture Decisions
- ADR-029: provider-call retries are in-process, not queued — the concrete answer to what
  "orchestration without a scheduler" means

---

## Phase 2C — Normalization & Validation

### Added
- `utils/normalizers/` — 10 normalizers (decimal, time, symbol, candle, quote, tick, exchange,
  instrument, instrument-alias, corporate-action, trading-session, trading-calendar-metadata,
  provider-metadata) plus `mapping.utils.ts`'s shared helpers
- `validation/errors/market-data-validation.error.ts` — 8 standardized error types, one base
  class, zero provider-specific subclasses
- `validation/candle.validator.ts`, `tick.validator.ts`, `quote.validator.ts` — business-rule
  correctness checks on normalized data
- `validation/reference-data.validator.ts` — required fields, in-batch uniqueness, ISIN/CUSIP
  format
- `validation/provider-data.validator.ts` — capability, metadata, configuration validation
- `validation/duplicate-detector.ts` — reusable candle/tick/quote duplicate detection
- `validation/data-quality-rules.ts` — real implementations of Phase 1's `InvalidValueDetector`/
  `OutOfOrderDetector` contracts, plus 6 standalone quality-rule check functions
- 44 new unit tests across 8 spec files, all genuinely executed unconditionally (pure logic, no
  database dependency)
- `docs/rmsm-ai/AI_101_MARKET_DATA_PHASE_2C_NORMALIZATION_VALIDATION.md`,
  `AI_101_VALIDATION_RULES.md`, `AI_101_MARKET_DATA_PHASE_2C_FILES_CHANGED.md`

### Architecture Decisions
- ADR-027: new error hierarchy named `MarketDataValidationError`, not `ValidationError`
  (collision avoidance with `@rmsm/shared`'s existing HTTP-layer error class)
- ADR-028: concatenated symbol pairs (`"BTCUSDT"`) are never split by the normalizer — a
  permanent boundary; `InstrumentAlias` remains the real resolution mechanism

---

## Phase 2B — Provider Infrastructure

### Added
- `interfaces/tick-provider.interface.ts`, `corporate-action-provider.interface.ts`,
  `reference-data-provider.interface.ts`, `health-provider.interface.ts`,
  `instrument-provider.interface.ts` — 5 new provider capability interfaces (the remaining 3 of
  Phase 2B's 8 named capabilities were already Phase 1's `HistoricalDataClient`/`QuoteClient`/
  `SymbolSearchClient`)
- `interfaces/provider-metadata.interface.ts` — `ProviderMetadata`
- `interfaces/provider-resolver.interface.ts` — `ProviderResolutionContext`, `ProviderResolver`
- `providers/provider-registry.service.ts` — real `ProviderRegistryService`
- `providers/provider-factory.service.ts` — real `ProviderFactoryService` (Map-based dispatch,
  zero switch statements)
- `providers/provider-resolver.service.ts` — real `ProviderResolverService`
- `providers/internal-feed.provider.ts` — `InternalFeedProvider`, the "Custom Provider"
  reference implementation (real, deterministic, no external network calls)
- `providers/provider-registrar.service.ts` — startup registration wiring
- 15 new unit tests across 3 new spec files (Registry, Factory, Resolver), all genuinely
  executed and passing

### Changed
- `interfaces/market-data-provider.interface.ts` — composite `MarketDataProvider` interface
  extended with the 5 new capability fields + `metadata`; `ProviderRegistry`/
  `MarketDataProviderFactory` contracts extended to match Phase 2B's full spec
  (registration/discovery/capability query for the registry; builder-registration for the
  factory)
- `market-data.module.ts` — Registry/Factory/Resolver/Registrar wired in

### Architecture Decisions
- ADR-026: organization-aware provider resolution via a plain parameter, not a stored column —
  resolves the apparent tension with ADR-021 (no `organizationId` anywhere in AI-101)

---

## Phase 2A — Repository Layer

### Added
- `interfaces/models/` — 13 domain-model interfaces (3 files, grouped by theme)
- `repositories/mappers/` — Prisma-row-to-domain-model mapper functions (3 files)
- `repositories/*.repository.ts` — 13 repositories, each returning domain models only
- `market-data.module.ts` — initial module, repositories wired in
- 6 new unit tests (`MarketCandleRepository`)

### Architecture Decisions
- ADR-025: AI-101 repositories return domain models, never Prisma-generated types — a
  deliberate departure from every EP module's convention, applied per explicit instruction

---

## Phase 1 — Architecture, Schema, Contracts

### Added
- 13 Prisma models, 10 enums (additive to `packages/database/prisma/schema.prisma`)
- `apps/api/src/modules/market-data/` folder structure — `constants/`, `contracts/`, `dto/`,
  `interfaces/` populated; `repositories/`, `services/`, `providers/`, `synchronization/`,
  `validation/`, `utils/` marked deferred
- 4 documentation files under `docs/rmsm-ai/`

### Architecture Decisions
- ADR-021: AI-101 has no `organizationId` anywhere — market data is global/product data,
  inverting every prior EP module's tenancy assumption, on purpose
- ADR-022: corrections are new rows, never in-place updates
