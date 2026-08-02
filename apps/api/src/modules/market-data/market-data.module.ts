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
import { MarketDataAdminService } from "./services/market-data-admin.service";
import { ProviderDiagnosticsService } from "./services/provider-diagnostics.service";
import { HistoricalImportService } from "./services/historical-import.service";
import { SynchronizationService } from "./services/synchronization.service";
import { ExchangeController } from "./controllers/exchange.controller";
import { InstrumentController } from "./controllers/instrument.controller";
import { MarketCandleController } from "./controllers/market-candle.controller";
import { MarketQuoteController } from "./controllers/market-quote.controller";
import { MarketTickController } from "./controllers/market-tick.controller";
import { CorporateActionController } from "./controllers/corporate-action.controller";
import { ProviderConfigController } from "./controllers/provider-config.controller";
import { SynchronizationController } from "./controllers/synchronization.controller";
import { MarketDataProviderBootstrapService } from "./bootstrap/market-data-provider-bootstrap.service";
import { ProviderConnectionTestService } from "./services/provider-connection-test.service";
import { TwelveDataRegistrarService } from "./providers/twelve-data/twelve-data.module";
import { AlphaVantageRegistrarService } from "./providers/alphavantage/alphavantage.module";
import { AlphaVantageCacheService } from "./providers/alphavantage/alphavantage.cache";

/**
 * AI-101 Phase 2A: 13 repositories, domain-model layer (ADR-025).
 * Phase 2B: Provider Registry, Factory, Resolver. Phase 2C:
 * normalization/validation (pure functions, no module wiring needed).
 * Phase 3: the service layer (MarketDataService, HistoricalImportService,
 * SynchronizationService, ProviderOrchestrationService,
 * MarketDataMetricsService). Phase 4 (this addition): 8 REST
 * controllers, plus `MarketDataAdminService` — a small new service
 * exposing provider-config/import-job data no Phase 3 service read-side
 * ever needed until controllers existed to expose it (same "necessary
 * plumbing, not new business logic" category as MarketDataService's new
 * exchange/tick pass-through methods this phase). No repository,
 * provider, or synchronization-design changes this phase, per Phase 4's
 * explicit scope.
 */
@Module({
  imports: [AuthModule],
  controllers: [
    ExchangeController,
    InstrumentController,
    MarketCandleController,
    MarketQuoteController,
    MarketTickController,
    CorporateActionController,
    ProviderConfigController,
    SynchronizationController,
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
    ProviderRegistryService,
    ProviderFactoryService,
    ProviderResolverService,
    ProviderRegistrarService,
    ProviderOrchestrationService,
    ProviderConnectionTestService,
    MarketDataMetricsService,
    MarketDataService,
    MarketDataAdminService,
    HistoricalImportService,
    SynchronizationService,
    MarketDataProviderBootstrapService,
    ProviderDiagnosticsService,
    ProviderRegistrarService,
    TwelveDataRegistrarService,
    ProviderRegistrarService,
    TwelveDataRegistrarService,
    ProviderRegistrarService,
    TwelveDataRegistrarService,
    AlphaVantageCacheService,
    AlphaVantageRegistrarService,
    ProviderOrchestrationService,
    AlphaVantageRegistrarService,
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
    ProviderConnectionTestService,
    MarketDataMetricsService,
    MarketDataService,
    MarketDataAdminService,
    HistoricalImportService,
    SynchronizationService,
    ProviderDiagnosticsService,
    
  ],
})
export class MarketDataModule {}
