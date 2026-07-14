import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { MarketDataProviderConfigRepository } from "./repositories/market-data-provider-config.repository";
import { ExchangeRepository } from "./repositories/exchange.repository";
import { TradingSessionRepository } from "./repositories/trading-session.repository";
import { SupportedTimeframeRepository } from "./repositories/supported-timeframe.repository";
import { InstrumentRepository } from "./repositories/instrument.repository";
import { InstrumentAliasRepository } from "./repositories/instrument-alias.repository";
import { MarketCandleRepository } from "./repositories/market-candle.repository";
import { MarketQuoteRepository } from "./repositories/market-quote.repository";
import { MarketTickRepository } from "./repositories/market-tick.repository";
import { CorporateActionRepository } from "./repositories/corporate-action.repository";
import { DataImportJobRepository } from "./repositories/data-import-job.repository";
import { DataQualityIssueRepository } from "./repositories/data-quality-issue.repository";
import { DataGapRepository } from "./repositories/data-gap.repository";
import { ProviderRegistryService } from "./providers/provider-registry.service";
import { ProviderFactoryService } from "./providers/provider-factory.service";
import { ProviderResolverService } from "./providers/provider-resolver.service";
import { ProviderRegistrarService } from "./providers/provider-registrar.service";
import { ProviderOrchestrationService } from "./services/provider-orchestration.service";
import { MarketDataMetricsService } from "./services/market-data-metrics.service";
import { MarketDataService } from "./services/market-data.service";
import { HistoricalImportService } from "./services/historical-import.service";
import { SynchronizationService } from "./services/synchronization.service";

/**
 * AI-101 Phase 2A: 13 repositories, domain-model layer (ADR-025).
 * Phase 2B: Provider Registry, Factory, Resolver. Phase 2C:
 * normalization/validation (pure functions, not NestJS providers — no
 * module wiring needed for them). Phase 3 (this addition): the service
 * layer — `MarketDataService` (read-side), `HistoricalImportService`
 * (write-side orchestration: fetch → validate → deduplicate → persist,
 * transactionally), `SynchronizationService` (sync decision logic, no
 * scheduler), plus `ProviderOrchestrationService` (retry/rate-limit
 * policy application) and `MarketDataMetricsService` (metrics hooks)
 * that both depend on. Imports `AuthModule` for `AuditService` — the
 * first phase with real service-layer mutations to audit.
 * Controllers, GraphQL, WebSockets, and actual scheduler/queue
 * registration remain explicitly out of scope this phase.
 */
@Module({
  imports: [AuthModule],
  providers: [
    MarketDataProviderConfigRepository,
    ExchangeRepository,
    TradingSessionRepository,
    SupportedTimeframeRepository,
    InstrumentRepository,
    InstrumentAliasRepository,
    MarketCandleRepository,
    MarketQuoteRepository,
    MarketTickRepository,
    CorporateActionRepository,
    DataImportJobRepository,
    DataQualityIssueRepository,
    DataGapRepository,
    ProviderRegistryService,
    ProviderFactoryService,
    ProviderResolverService,
    ProviderRegistrarService,
    ProviderOrchestrationService,
    MarketDataMetricsService,
    MarketDataService,
    HistoricalImportService,
    SynchronizationService,
  ],
  exports: [
    MarketDataProviderConfigRepository,
    ExchangeRepository,
    TradingSessionRepository,
    SupportedTimeframeRepository,
    InstrumentRepository,
    InstrumentAliasRepository,
    MarketCandleRepository,
    MarketQuoteRepository,
    MarketTickRepository,
    CorporateActionRepository,
    DataImportJobRepository,
    DataQualityIssueRepository,
    DataGapRepository,
    ProviderRegistryService,
    ProviderFactoryService,
    ProviderResolverService,
    ProviderOrchestrationService,
    MarketDataMetricsService,
    MarketDataService,
    HistoricalImportService,
    SynchronizationService,
  ],
})
export class MarketDataModule {}
