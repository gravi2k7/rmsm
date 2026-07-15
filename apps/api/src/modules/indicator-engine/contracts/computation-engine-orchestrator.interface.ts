import type { ExecutionRequest } from "./execution-request.interface";
import type { ExecutionResult } from "./execution-result.interface";
import type { IndicatorResult } from "./indicator-result.interface";

/**
 * Item 1's own responsibility list, exactly: receive execution request,
 * prepare execution context, validate request, invoke indicator
 * execution, produce execution result, report execution status. This is
 * the ONE-execution orchestrator — distinct from
 * `computation-engine.interface.ts`'s `ComputationScheduler` (batch,
 * dependency-graph-aware, Phase 2C) and from `ExecutionScheduler`
 * (`execution-scheduler.interface.ts` — sequencing MULTIPLE independent
 * requests, not dependency-aware). `ComputationEngine`
 * is what both of those ultimately call, once per request, to actually
 * run one indicator through its full lifecycle.
 *
 * **Phase 3 addition**: the optional `resolvedDependencyResults`
 * parameter — supplied by `IndicatorEngineService` (Phase 3) after it
 * walks an `ExecutionPlan`'s ordered steps (Phase 2C) and executes each
 * one's own dependencies first. `ComputationEngine` itself still
 * resolves nothing — it only accepts what's already been resolved and
 * fails clearly if a required dependency's result is missing.
 */
export interface ComputationEngine {
  execute(request: ExecutionRequest, resolvedDependencyResults?: Record<string, IndicatorResult>): Promise<ExecutionResult>;
}
