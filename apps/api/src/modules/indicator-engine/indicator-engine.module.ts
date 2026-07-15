import { Module } from "@nestjs/common";
import { MarketDataModule } from "../market-data/market-data.module";
import { IndicatorRegistryService } from "./registry/indicator-registry.service";
import { RegistryValidatorService } from "./registry/registry-validator.service";
import { RegistryQueryService } from "./registry/registry-query.service";
import { IndicatorDefinitionRegistrarService } from "./registry/indicator-definition-registrar.service";
import { IndicatorFactoryService } from "./registry/indicator-factory.service";
import { ExecutionValidatorService } from "./engine/execution-validator.service";
import { ExecutionMetricsService } from "./engine/execution-metrics.service";
import { ComputationEngineService } from "./engine/computation-engine.service";
import { ExecutionSchedulerService } from "./engine/execution-scheduler.service";

/**
 * AI-102 Phase 2A: the registry layer (real). Phase 2B (this addition):
 * the computation/execution layer (real) — `ComputationEngineService`
 * (item 1), `ExecutionSchedulerService` (item 5), plus their supporting
 * `ExecutionValidatorService`/`ExecutionMetricsService`, and
 * `IndicatorFactoryService` (genuinely empty of calculation builders
 * this phase — see that service's own comment). Imports `MarketDataModule`
 * for `MarketDataService` — the first real AI-101 integration point in
 * this engine. No dependency-graph execution, no caching, no
 * controllers, no real indicator calculations — exactly this phase's
 * scope.
 */
@Module({
  imports: [MarketDataModule],
  providers: [
    IndicatorRegistryService,
    RegistryValidatorService,
    RegistryQueryService,
    IndicatorDefinitionRegistrarService,
    IndicatorFactoryService,
    ExecutionValidatorService,
    ExecutionMetricsService,
    ComputationEngineService,
    ExecutionSchedulerService,
  ],
  exports: [
    IndicatorRegistryService,
    RegistryValidatorService,
    RegistryQueryService,
    IndicatorFactoryService,
    ComputationEngineService,
    ExecutionSchedulerService,
  ],
})
export class IndicatorEngineModule {}
