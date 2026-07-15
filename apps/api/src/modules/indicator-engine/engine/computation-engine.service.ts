import { randomUUID } from "crypto";
import { Injectable, Logger } from "@nestjs/common";
import { MarketDataService } from "../../market-data/services/market-data.service";
import { IndicatorRegistryService } from "../registry/indicator-registry.service";
import { IndicatorFactoryService } from "../registry/indicator-factory.service";
import { ExecutionValidatorService } from "./execution-validator.service";
import { ExecutionMetricsService } from "./execution-metrics.service";
import { ExecutionLifecycleTracker } from "./execution-lifecycle-tracker";
import { CalculationWindowException } from "../contracts/execution.errors";
import type { ComputationEngine as ComputationEngineContract } from "../contracts/computation-engine-orchestrator.interface";
import type { ExecutionRequest } from "../contracts/execution-request.interface";
import type { ExecutionResult } from "../contracts/execution-result.interface";
import type { ExecutionContext } from "../contracts/execution-context.interface";
import type { IndicatorResult } from "../contracts/indicator-result.interface";

/**
 * Real implementation of `contracts/computation-engine-orchestrator.interface.ts`
 * — item 1's own responsibility list, exactly: receive execution
 * request, prepare execution context, validate request, invoke
 * indicator execution, produce execution result, report execution
 * status. This is the first place in AI-102 that actually calls out to
 * AI-101 (`MarketDataService.getCandles()`) — a real, legitimate
 * integration point per this phase's own "AI-102 consumes only AI-101
 * services/contracts" rule (a service, not a repository).
 *
 * **Phase 3 update**: `execute()` now accepts an optional
 * `resolvedDependencyResults` map — the exact integration point named
 * as a Phase 3 prerequisite in AI102_PHASE2C.md. A dependency-bearing
 * indicator (MACD, Keltner Channel, every composite proprietary
 * indicator) can now execute for real, PROVIDED its caller
 * (`IndicatorEngineService`, this phase) has already computed every
 * dependency's own result and supplies them here — this method itself
 * still does no dependency resolution or ordering of its own (that
 * remains `DependencyResolverService`/`ExecutionPlannerService`'s job,
 * Phase 2C); it only accepts what's already been resolved. Calling
 * `execute()` directly for a dependency-bearing indicator WITHOUT
 * supplying `resolvedDependencyResults` still fails clearly — this
 * method never silently proceeds with an incomplete dependency set.
 *
 * **Equally real, unchanged from Phase 2B**: every one of the 28
 * definitions Phase 2A registered will still fail at the
 * `IndicatorFactoryService.create()` step with
 * `IndicatorNotFoundException`, because no real `calculate()`
 * implementation exists for any of them yet. This phase does not add
 * one — "no indicator calculations" remains true.
 */
@Injectable()
export class ComputationEngineService implements ComputationEngineContract {
  private readonly logger = new Logger(ComputationEngineService.name);

  constructor(
    private readonly registry: IndicatorRegistryService,
    private readonly factory: IndicatorFactoryService,
    private readonly marketDataService: MarketDataService,
    private readonly validator: ExecutionValidatorService,
    private readonly metrics: ExecutionMetricsService,
  ) {}

  async execute(request: ExecutionRequest, resolvedDependencyResults: Record<string, IndicatorResult> = {}): Promise<ExecutionResult> {
    const executionId = randomUUID();
    const tracker = new ExecutionLifecycleTracker();
    const overallStart = Date.now();
    // No queue infrastructure exists this phase (item 5's own "no
    // threading implementation... architecture only") — queueTimeMs is
    // honestly 0, not a guessed or omitted value.
    const queueTimeMs = 0;

    try {
      const validationStart = Date.now();
      this.validator.validateNotCancelled(request);
      this.validator.validateTimeoutConfiguration(request);
      tracker.transitionTo("VALIDATED");
      const validationTimeMs = Date.now() - validationStart;

      const initStart = Date.now();
      const definition = this.registry.getVersion(request.indicatorInstance.definitionIdentifier, request.indicatorInstance.definitionVersion);

      const missingDependencies = definition.dependencies.filter((depId) => !(depId in resolvedDependencyResults));
      if (missingDependencies.length > 0) {
        throw new CalculationWindowException(
          `"${definition.identifier}" depends on [${definition.dependencies.join(", ")}], and [${missingDependencies.join(", ")}] ${missingDependencies.length === 1 ? "was" : "were"} not supplied in resolvedDependencyResults. Direct callers of ComputationEngineService.execute() must resolve and pass every dependency's own result first (IndicatorEngineService, Phase 3, does this via ExecutionPlannerService's ordered plan) — this method does not resolve dependencies itself.`,
          { definition, missingDependencies },
        );
      }

      const candles = await this.marketDataService.getCandles(
        request.marketDataReference.instrumentId,
        request.timeframe,
        request.calculationWindow.from,
        request.calculationWindow.to,
      );

      const context: ExecutionContext = Object.freeze({
        executionId,
        indicatorInstance: request.indicatorInstance,
        indicatorDefinition: definition,
        marketDataReference: { instrumentId: request.marketDataReference.instrumentId, candles },
        timeframe: request.timeframe,
        parameters: request.indicatorInstance.parameters,
        calculationWindow: request.calculationWindow,
        executionTimestamp: new Date(),
        metadata: {},
        dependencyResults: resolvedDependencyResults,
      });

      this.validator.validateContext(context);
      this.validator.validateMarketDataPresence(context);
      this.validator.validateTimeframe(context);
      this.validator.validateParameters(context);

      tracker.transitionTo("INITIALIZED");
      tracker.transitionTo("READY");
      const initializationTimeMs = Date.now() - initStart;

      const calcStart = Date.now();
      tracker.transitionTo("EXECUTING");
      const indicator = this.factory.create(definition.identifier, context.parameters);
      const producedValues = indicator.calculate(context);
      tracker.transitionTo("COMPLETED");
      const calculationTimeMs = Date.now() - calcStart;

      const executionMetrics = this.metrics.buildMetrics(queueTimeMs, validationTimeMs, initializationTimeMs, calculationTimeMs);
      this.metrics.recordExecution(executionMetrics);

      return Object.freeze({
        executionId,
        indicatorInstanceId: request.indicatorInstance.instanceId,
        durationMs: Date.now() - overallStart,
        lifecycleStatus: tracker.getState(),
        calculationMetadata: { mode: request.calculationWindow.mode, candleCount: candles.length },
        producedValues,
        warnings: [],
        errors: [],
        metrics: executionMetrics,
      });
    } catch (error) {
      // The lifecycle tracker's own transition table (fixed this phase
      // to allow READY -> FAILED, a real gap caught while writing this
      // exact catch block) means FAILED is reachable from every state a
      // thrown error could leave us in — no bypass needed.
      const currentState = tracker.getState();
      if (currentState !== "FAILED") {
        try {
          tracker.transitionTo("FAILED");
        } catch {
          // If even the FAILED transition is rejected (a state this
          // phase's own transition table doesn't anticipate), the
          // lifecycle tracker's own state is the more honest signal to
          // report than silently forcing one — logged, not thrown
          // again, so the original error is still what the caller sees.
          this.logger.warn(`Could not transition to FAILED from "${currentState}" — reporting the original error anyway.`);
        }
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Execution ${executionId} failed: ${message}`);

      return Object.freeze({
        executionId,
        indicatorInstanceId: request.indicatorInstance.instanceId,
        durationMs: Date.now() - overallStart,
        lifecycleStatus: tracker.getState(),
        calculationMetadata: { mode: request.calculationWindow.mode, candleCount: 0 },
        warnings: [],
        errors: [message],
        metrics: this.metrics.buildMetrics(queueTimeMs, 0, 0, 0),
      });
    }
  }
}
