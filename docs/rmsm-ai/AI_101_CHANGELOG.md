# Changelog — AI-101: Market Data Management

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
