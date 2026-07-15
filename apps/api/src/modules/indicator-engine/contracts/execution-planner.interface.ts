import type { DependencyGraph } from "./dependency-graph.interface";
import type { ExecutionPlan } from "./execution-plan.interface";
import type { CalculationMode } from "./calculation-window.interface";

/**
 * Item 3 — Input: Indicator Request. Output: Execution Plan. "No
 * scheduler implementation" — this produces the PLAN
 * (`ExecutionSchedulerService`, Phase 2B, is what would eventually
 * consume one, converting each `ExecutionPlanStep` into a real
 * `ExecutionRequest` — that wiring is a genuine, named Phase 3+
 * follow-up, not built this phase).
 */
export interface IndicatorRequest {
  indicatorIdentifier: string;
  version?: string;
  calculationMode: CalculationMode;
  timeoutMs?: number;
  cancellable: boolean;
}

export interface ExecutionPlanner {
  createPlan(graph: DependencyGraph, request: IndicatorRequest): ExecutionPlan;
}
