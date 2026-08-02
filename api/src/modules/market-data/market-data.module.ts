import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
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
import { CandleQualityMetadataRepository } from "./repositories/candle-quality-metadata.repository";
import { DerivedIndicatorSnapshotRepository } from "./repositories/derived-indicator-snapshot.repository";
import { MarketDataAiSnapshotRepository } from "./repositories/market-data-ai-snapshot.repository";
import { ProviderRegistryService } from "./providers/provider-registry.service";
import { ProviderFactoryService } from "./providers/provider-factory.service";
import { ProviderResolverService } from "./providers/provider-resolver.service";
import { ProviderRegistrarService } from "./providers/provider-registrar.service";
import { TwelveDataRegistrarService } from "./providers/twelve-data/twelve-data.module";
import { CoinGeckoRegistrarService } from "./providers/coingecko/coingecko.module";
import { CoinGeckoCacheService } from "./providers/coingecko/coingecko.cache";
import { AlphaVantageRegistrarService } from "./providers/alphavantage/alphavantage.module";
import { AlphaVantageCacheService } from "./providers/alphavantage/alphavantage.cache";
import { YahooFinanceRegistrarService } from "./providers/yahoo-finance/yahoo-finance.module";
import { YahooFinanceCacheService } from "./providers/yahoo-finance/yahoo-finance.cache";
import { ProviderOrchestrationService } from "./services/provider-orchestration.service";
import { MarketDataMetricsService } from "./services/market-data-metrics.service";
import { MarketDataService } from "./services/market-data.service";
import { MarketDataAdminService } from "./services/market-data-admin.service";
import { HistoricalImportService } from "./services/historical-import.service";
import { SynchronizationService } from "./services/synchronization.service";
import { ProviderCredentialService } from "./services/provider-credential.service";
import { ProviderFailoverService } from "./services/provider-failover.service";
import { ProviderDiagnosticsService } from "./services/provider-diagnostics.service";
import { MarketDataStreamPublisherService } from "./services/market-data-stream-publisher.service";
import { QualityScoringService } from "./services/quality-scoring.service";
import { ValidationReportService } from "./services/validation-report.service";
import { GapDetectionService } from "./services/gap-detection.service";
import { GapRepairService } from "./services/gap-repair.service";
import { StorageMonitoringService } from "./services/storage-monitoring.service";
import { DerivedDataService } from "./services/derived-data.service";
import { AiReadinessService } from "./services/ai-readiness.service";
import { ImportSchedulerService } from "./services/import-scheduler.service";
import { MonitoringDashboardService } from "./services/monitoring-dashboard.service";
import { ImportSchedulerProcessor } from "./workers/import-scheduler.processor";
import { ImportPollProcessor } from "./workers/import-poll.processor";
import { ImportCronRegistrar } from "./workers/import-cron.registrar";
import { MarketDataProviderBootstrapService } from "./bootstrap/market-data-provider-bootstrap.service";
import { ExchangeController } from "./controllers/exchange.controller";
import { InstrumentController } from "./controllers/instrument.controller";
import { MarketCandleController } from "./controllers/market-candle.controller";
import { MarketQuoteController } from "./controllers/market-quote.controller";
import { MarketTickController } from "./controllers/market-tick.controller";
import { CorporateActionController } from "./controllers/corporate-action.controller";
import { ProviderConfigController } from "./controllers/provider-config.controller";
import { SynchronizationController } from "./controllers/synchronization.controller";
import { ImportJobController } from "./controllers/import-job.controller";
import { GapController } from "./controllers/gap.controller";
import { QualityController } from "./controllers/quality.controller";
import { DerivedDataController } from "./controllers/derived-data.controller";
import { AiReadinessController } from "./controllers/ai-readiness.controller";
import { MonitoringController } from "./controllers/monitoring.controller";

/**
 * AI-101 Phase 2A: 13 repositories, domain-model layer (ADR-025).
 * Phase 2B: Provider Registry, Factory, Resolver. Phase 2C:
 * normalization/validation (pure functions, no module wiring needed).
 * Phase 3: the service layer (MarketDataService, HistoricalImportService,
 * SynchronizationService, ProviderOrchestrationService,
 * MarketDataMetricsService). Phase 4: 8 REST controllers, plus
 * `MarketDataAdminService`.
 *
 * FIP-001 (this addition) extends the module with production-activation
 * capabilities across Domains 1-12 per its own prompt — see each new
 * repository/service/controller's own header comment for what it adds
 * and why. Nothing above this comment (every Phase 2A-4 provider,
 * repository, or controller) was modified beyond the additive
 * dependency-injection wiring below; no existing provider/repository/
 * controller was replaced, per the explicit "the provider integrations
 * already exist — extend, do not recreate" instruction this phase was
 * given. Two new BullMQ queues back Domain 3's scheduler:
 * `market-data-import` (one job per actual import execution/resume/
 * retry, consumed by `ImportSchedulerProcessor`) and
 * `market-data-import-poll` (one repeatable trigger job, consumed by
 * `ImportPollProcessor`, that calls `ImportSchedulerService.
 * pollAndEnqueueDueWork()`) — the same create-queue/register-repeatable-
 * trigger/consume-in-a-processor split as Module 005's billing-renewal
 * and webhook queues.
 */
@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: "market-data-import" }, { name: "market-data-import-poll" })],
  controllers: [
    ExchangeController,
    InstrumentController,
    MarketCandleController,
    MarketQuoteController,
    MarketTickController,
    CorporateActionController,
    ProviderConfigController,
    SynchronizationController,
    ImportJobController,
    GapController,
    QualityController,
    DerivedDataController,
    AiReadinessController,
    MonitoringController,
  ],
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
    CandleQualityMetadataRepository,
    DerivedIndicatorSnapshotRepository,
    MarketDataAiSnapshotRepository,
    ProviderRegistryService,
    ProviderFactoryService,
    ProviderResolverService,
    ProviderRegistrarService,
    TwelveDataRegistrarService,
    CoinGeckoCacheService,
    CoinGeckoRegistrarService,
    AlphaVantageCacheService,
    AlphaVantageRegistrarService,
    YahooFinanceCacheService,
    YahooFinanceRegistrarService,
    ProviderOrchestrationService,
    MarketDataMetricsService,
    MarketDataService,
    MarketDataAdminService,
    HistoricalImportService,
    SynchronizationService,
    ProviderCredentialService,
    ProviderFailoverService,
    ProviderDiagnosticsService,
    MarketDataStreamPublisherService,
    QualityScoringService,
    ValidationReportService,
    GapDetectionService,
    GapRepairService,
    StorageMonitoringService,
    DerivedDataService,
    AiReadinessService,
    ImportSchedulerService,
    MonitoringDashboardService,
    ImportSchedulerProcessor,
    ImportPollProcessor,
    ImportCronRegistrar,
    MarketDataProviderBootstrapService,
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
    CandleQualityMetadataRepository,
    DerivedIndicatorSnapshotRepository,
    MarketDataAiSnapshotRepository,
    ProviderRegistryService,
    ProviderFactoryService,
    ProviderResolverService,
    ProviderOrchestrationService,
    MarketDataMetricsService,
    MarketDataService,
    MarketDataAdminService,
    HistoricalImportService,
    SynchronizationService,
    ProviderFailoverService,
    GapDetectionService,
    GapRepairService,
    DerivedDataService,
    AiReadinessService,
  ],
})
export class MarketDataModule {}
