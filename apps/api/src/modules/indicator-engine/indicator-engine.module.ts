import { Module } from "@nestjs/common";
import { MarketDataModule } from "../market-data/market-data.module";
import { AuthModule } from "../auth/auth.module";
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
import { IndicatorQueryServiceImpl } from "./services/indicator-query.service";
import { IndicatorValidationServiceImpl } from "./services/indicator-validation.service";
import { IndicatorLifecycleServiceImpl } from "./services/indicator-lifecycle.service";
import { IndicatorExecutionServiceImpl } from "./services/indicator-execution.service";
import { IndicatorEngineServiceImpl } from "./services/indicator-engine.service";
import { ServiceMetricsService } from "./services/service-metrics.service";
import { IndicatorHealthService } from "./services/indicator-health.service";
import { IndicatorController } from "./rest/indicator.controller";

/**
 * AI-102 Phase 2A: the registry layer. Phase 2B: the computation/
 * execution layer. Phase 2C: the dependency graph layer. Phase 3: the
 * service layer. Phase 4 (this addition): **the REST API layer** —
 * `IndicatorController`, the only controller in this module,
 * communicating exclusively with `IndicatorEngineServiceImpl` (this
 * phase's own mandatory architecture rule — see that controller's own
 * header comment). `IndicatorHealthService` is the health endpoint's
 * own real, functional dependency.
 *
 * `IndicatorEngineServiceImpl` is the single class every future module
 * (AI-103+) should ever import from this one — this phase's own
 * explicit recommendation, implemented literally (see that class's own
 * header comment). Everything else exported below (the Phase 2A/2B/2C
 * primitives) remains exported for THIS project's own internal
 * flexibility during development, not because a future module is meant
 * to reach for them — item 6's own architecture rule ("future modules
 * should never interact directly with Registry/Planner/DependencyGraph/
 * ComputationEngine") is a calling-convention discipline this module
 * documents and recommends, not something a `providers`/`exports` array
 * can mechanically enforce on its own.
 */
@Module({
  imports: [MarketDataModule, AuthModule],
  controllers: [IndicatorController],
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
    IndicatorQueryServiceImpl,
    IndicatorValidationServiceImpl,
    IndicatorLifecycleServiceImpl,
    IndicatorExecutionServiceImpl,
    IndicatorEngineServiceImpl,
    ServiceMetricsService,
    IndicatorHealthService,
  ],
  exports: [
    IndicatorEngineServiceImpl,
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
