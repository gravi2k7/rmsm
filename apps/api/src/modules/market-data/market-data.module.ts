import { Module } from "@nestjs/common";
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

/**
 * AI-101 Phase 2A: 13 repositories, domain-model layer (ADR-025).
 * Phase 2B (this addition): Provider Registry, Factory, Resolver — all
 * DI-managed NestJS services, per Phase 2B's explicit "everything must
 * resolve through Provider Registry / Factory, no service instantiates
 * providers directly" requirement. `ProviderRegistrarService` performs
 * the one-time startup registration of every provider this phase has
 * (`InternalFeedProvider` only — Binance/Polygon/etc. adapters remain
 * deferred, "no provider SDK implementations"). Normalization/validation
 * (2C), business services, synchronization, and controllers remain later
 * phases.
 */
@Module({
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
  ],
})
export class MarketDataModule {}
