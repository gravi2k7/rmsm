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
import { DependencyGraphBuilderService } from "./dependency-graph/dependency-graph-builder.service";
import { CycleDetectorService } from "./dependency-graph/cycle-detector.service";
import { TopologicalSorterService } from "./dependency-graph/topological-sorter.service";
import { GraphValidatorService } from "./dependency-graph/graph-validator.service";
import { DependencyResolverService } from "./dependency-graph/dependency-resolver.service";
import { GraphMetricsService } from "./dependency-graph/graph-metrics.service";
import { ExecutionPlannerService } from "./dependency-graph/execution-planner.service";

/**
 * AI-102 Phase 2A: the registry layer (real). Phase 2B: the
 * computation/execution layer (real). Phase 2C (this addition): the
 * dependency graph layer (real) — `DependencyGraphBuilderService`
 * (builds an immutable graph from the registry), `CycleDetectorService`/
 * `TopologicalSorterService` (the two core algorithms), `GraphValidatorService`
 * (item 6), `DependencyResolverService` (item 2), `GraphMetricsService`
 * (item 10), `ExecutionPlannerService` (item 3, including the real
 * Execution Complexity Estimator). Imports `MarketDataModule` for
 * `MarketDataService` — the first real AI-101 integration point in this
 * engine. No real indicator calculations, no caching, no controllers —
 * exactly this phase's scope.
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
    DependencyGraphBuilderService,
    CycleDetectorService,
    TopologicalSorterService,
    GraphValidatorService,
    DependencyResolverService,
    GraphMetricsService,
    ExecutionPlannerService,
  ],
  exports: [
    IndicatorRegistryService,
    RegistryValidatorService,
    RegistryQueryService,
    IndicatorFactoryService,
    ComputationEngineService,
    ExecutionSchedulerService,
    DependencyGraphBuilderService,
    GraphValidatorService,
    DependencyResolverService,
    GraphMetricsService,
    ExecutionPlannerService,
  ],
})
export class IndicatorEngineModule {}
