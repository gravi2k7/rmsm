import type { ExecutionRequest } from "./execution-request.interface";
import type { ExecutionResult } from "./execution-result.interface";

/**
 * Item 1's own responsibility list, exactly: receive execution request,
 * prepare execution context, validate request, invoke indicator
 * execution, produce execution result, report execution status. This is
 * the ONE-execution orchestrator — distinct from
 * `computation-engine.interface.ts`'s `ComputationScheduler` (batch,
 * dependency-graph-aware, Phase 2C) and from `ExecutionScheduler`
 * (`execution-scheduler.interface.ts` — sequencing MULTIPLE independent
 * requests, this phase, but not dependency-aware). `ComputationEngine`
 * is what both of those ultimately call, once per request, to actually
 * run one indicator through its full lifecycle.
 */
export interface ComputationEngine {
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
}
