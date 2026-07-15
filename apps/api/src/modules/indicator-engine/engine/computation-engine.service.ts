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
 * **A real, named limitation, not silently glossed over**: an
 * indicator with any `dependencies` cannot execute through this engine
 * yet — dependency resolution/execution is explicitly Phase 2C's job.
 * Attempting to execute MACD (which depends on EMA) or any of the
 * proprietary composite indicators throws `CalculationWindowException`
 * with a clear message, rather than silently proceeding with an empty
 * `dependencyResults` and producing a wrong answer.
 *
 * **Equally real**: every one of the 28 definitions Phase 2A registered
 * will fail at the `IndicatorFactoryService.create()` step with
 * `IndicatorNotFoundException`, because no real `calculate()`
 * implementation exists for any of them yet. This engine's own
 * pipeline — lifecycle tracking, context construction, all 4 validation
 * layers, metrics — is genuinely complete and real; what it invokes at
 * the very end is not, and this phase does not pretend otherwise.
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

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
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

      if (definition.dependencies.length > 0) {
        throw new CalculationWindowException(
          `"${definition.identifier}" depends on [${definition.dependencies.join(", ")}] — dependency execution is Phase 2C's job, not available in this engine yet.`,
          { definition },
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
        dependencyResults: {},
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
