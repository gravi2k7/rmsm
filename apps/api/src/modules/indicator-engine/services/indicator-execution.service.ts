import { Injectable, Logger } from "@nestjs/common";
import { IndicatorRegistryService } from "../registry/indicator-registry.service";
import { IndicatorInstance } from "../registry/indicator-instance";
import { DependencyGraphBuilderService } from "../dependency-graph/dependency-graph-builder.service";
import { GraphValidatorService } from "../dependency-graph/graph-validator.service";
import { ExecutionPlannerService } from "../dependency-graph/execution-planner.service";
import { ComputationEngineService } from "../engine/computation-engine.service";
import { ServiceMetricsService } from "./service-metrics.service";
import type { IndicatorExecutionService as IndicatorExecutionServiceContract } from "../contracts/service-contracts.interface";
import type { ExecuteIndicatorRequest, IndicatorExecutionResponse } from "../contracts/service-models.interface";
import type { ExecutionRequest } from "../contracts/execution-request.interface";
import type { ExecutionResult } from "../contracts/execution-result.interface";
import type { IndicatorResult } from "../contracts/indicator-result.interface";
import type { IndicatorTimeframe } from "../contracts/timeframe";
import { ExecutionServiceException } from "../contracts/service.errors";

/**
 * Real implementation of `contracts/service-contracts.interface.ts`'s
 * `IndicatorExecutionService` — item 3's own 5 responsibilities:
 * validate, invoke the planner, invoke the computation engine, collect
 * results, normalize responses. **This is where AI-102's full pipeline
 * finally connects end to end**: `DependencyGraphBuilderService` (Phase
 * 2C) builds the graph, `ExecutionPlannerService` (Phase 2C) produces
 * the ordered plan, and this service walks that plan step by step,
 * calling `ComputationEngineService.execute()` (Phase 2B, extended this
 * phase to accept pre-resolved dependency results) for each one —
 * feeding each completed step's own `IndicatorResult` forward as the
 * `resolvedDependencyResults` for whatever later step actually depends
 * on it. A dependency-bearing indicator (MACD, Keltner Channel,
 * Institutional Structure's full proprietary chain) can now genuinely
 * execute end to end, PROVIDED real `Indicator.calculate()`
 * implementations exist for every step (they still don't — "no
 * indicator calculations" remains true this phase; what's real here is
 * the orchestration, not the arithmetic).
 *
 * **A real design decision, flagged rather than silently assumed**:
 * only the ROOT step (the indicator the caller actually asked for)
 * uses the caller's own `request.parameters`. Every dependency step
 * uses ITS OWN definition's `defaultParameters` — a caller executing
 * MACD has no way this phase to say "and use EMA(50) instead of the
 * default EMA(20) for the fast leg." Overriding a specific dependency's
 * own parameters is a real, plausible future need (a genuine
 * `IndicatorInstance`-per-step configuration), not solved here.
 *
 * **A second real limitation**: every step in a plan executes against
 * the SAME `instrumentId` as the root request. A future indicator
 * wanting a different instrument for one of its own dependencies (e.g.
 * a relative-strength calculation against a named benchmark) isn't
 * supported by this orchestration yet.
 */
@Injectable()
export class IndicatorExecutionServiceImpl implements IndicatorExecutionServiceContract {
  private readonly logger = new Logger(IndicatorExecutionServiceImpl.name);

  constructor(
    private readonly registry: IndicatorRegistryService,
    private readonly graphBuilder: DependencyGraphBuilderService,
    private readonly graphValidator: GraphValidatorService,
    private readonly planner: ExecutionPlannerService,
    private readonly computationEngine: ComputationEngineService,
    private readonly metrics: ServiceMetricsService,
  ) {}

  async execute(request: ExecuteIndicatorRequest): Promise<IndicatorExecutionResponse> {
    const startTime = Date.now();
    this.metrics.recordRequest();

    let graph;
    let plan;
    const planningStart = Date.now();
    try {
      graph = this.graphBuilder.build();
      this.graphValidator.validate(graph);
      plan = this.planner.createPlan(graph, {
        indicatorIdentifier: request.indicatorIdentifier,
        version: request.version,
        calculationMode: request.calculationMode,
        timeoutMs: request.executionOptions?.timeoutMs,
        cancellable: request.executionOptions?.cancellable ?? true,
      });
      this.metrics.recordPlanningDuration(Date.now() - planningStart);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Date.now() - startTime;
      this.logger.warn(`requestId=${request.requestId ?? "none"} indicatorId=${request.indicatorIdentifier} durationMs=${durationMs} status=PLANNING_FAILED — ${message}`);
      this.metrics.recordExecutionOutcome(false, durationMs);
      throw new ExecutionServiceException(`Planning failed for "${request.indicatorIdentifier}": ${message}`, { request });
    }

    const stepResults: Record<string, ExecutionResult> = {};
    const resolvedResults: Record<string, IndicatorResult> = {};

    for (const step of plan.executionOrder) {
      const definition = this.registry.getVersion(step.identifier, step.version);
      const isRoot = step.identifier === request.indicatorIdentifier;
      const parameters = isRoot ? request.parameters : definition.defaultParameters;

      const stepDependencyResults: Record<string, IndicatorResult> = {};
      for (const depId of definition.dependencies) {
        if (resolvedResults[depId]) stepDependencyResults[depId] = resolvedResults[depId];
      }

      const stepRequest: ExecutionRequest = {
        indicatorInstance: new IndicatorInstance(definition, parameters, `${step.identifier}_${plan.planId}`),
        timeframe: request.timeframe as IndicatorTimeframe,
        marketDataReference: { instrumentId: request.instrumentId },
        calculationWindow: { mode: request.calculationMode, from: new Date(request.from), to: new Date(request.to) },
        executionOptions: { timeoutMs: request.executionOptions?.timeoutMs },
      };

      const result = await this.computationEngine.execute(stepRequest, stepDependencyResults);
      stepResults[step.identifier] = result;

      if (result.lifecycleStatus !== "COMPLETED") {
        const durationMs = Date.now() - startTime;
        this.logExecutionOutcome({
          requestId: request.requestId,
          executionId: result.executionId,
          graphId: graph.graphId,
          indicatorId: request.indicatorIdentifier,
          durationMs,
          status: result.lifecycleStatus,
          extra: `aborted at step "${step.identifier}": ${result.errors.join("; ")}`,
        });
        this.metrics.recordExecutionOutcome(false, durationMs);
        return {
          summary: {
            executionId: result.executionId,
            indicatorIdentifier: request.indicatorIdentifier,
            status: result.lifecycleStatus === "CANCELLED" ? "CANCELLED" : "FAILED",
            durationMs,
            stepCount: Object.keys(stepResults).length,
          },
          stepResults,
          errors: result.errors,
        };
      }

      if (result.producedValues) resolvedResults[step.identifier] = result.producedValues;
    }

    const rootResult = stepResults[request.indicatorIdentifier];
    if (!rootResult) {
      // Genuinely unreachable given plan.executionOrder always includes
      // the root as its own last step (ExecutionPlannerService's own
      // contract) — an explicit throw here is honest about that
      // invariant rather than silently returning an incomplete
      // response if it were ever violated.
      throw new ExecutionServiceException(`Execution plan ${plan.planId} completed without producing a result for its own root "${request.indicatorIdentifier}".`, { plan });
    }

    const totalDurationMs = Date.now() - startTime;
    this.logExecutionOutcome({
      requestId: request.requestId,
      executionId: rootResult.executionId,
      graphId: graph.graphId,
      indicatorId: request.indicatorIdentifier,
      durationMs: totalDurationMs,
      status: "COMPLETED",
    });
    this.metrics.recordExecutionOutcome(true, totalDurationMs);
    return {
      summary: {
        executionId: rootResult.executionId,
        indicatorIdentifier: request.indicatorIdentifier,
        status: "COMPLETED",
        durationMs: totalDurationMs,
        stepCount: Object.keys(stepResults).length,
      },
      result: rootResult,
      stepResults,
      errors: [],
    };
  }

  /**
   * Item 4's own field list, exactly, on EVERY execution — success or
   * failure, not just failures (the original implementation only ever
   * logged on the abort path; a real, named gap this phase fixes,
   * since "every execution should include..." plainly means both
   * outcomes, not just the interesting-looking one). A single
   * structured, greppable line — `key=value` pairs, not a free-form
   * sentence — so a real log aggregator (Observability Hooks, item 5)
   * can parse and index every field without regex-scraping a prose
   * message.
   */
  private logExecutionOutcome(fields: {
    requestId?: string;
    executionId: string;
    graphId: string;
    indicatorId: string;
    durationMs: number;
    status: string;
    extra?: string;
  }): void {
    const line = `requestId=${fields.requestId ?? "none"} executionId=${fields.executionId} graphId=${fields.graphId} indicatorId=${fields.indicatorId} durationMs=${fields.durationMs} status=${fields.status}${fields.extra ? ` — ${fields.extra}` : ""}`;
    if (fields.status === "COMPLETED") {
      this.logger.log(line);
    } else {
      this.logger.warn(line);
    }
  }
}
