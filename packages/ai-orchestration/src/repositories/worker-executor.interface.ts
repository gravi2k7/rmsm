import type { AgentGoal } from "@rmsm/ai-agents";
import type { WorkerExecutionResult } from "../domain/entities/worker-execution-result.entity";

/** The provider-independence seam over "actually run this worker
 * agent." Ships one real implementation, `AgentRuntimeWorkerExecutor`,
 * which delegates straight to AI-401's own `AgentRuntime` — this
 * package never reimplements agent execution. */
export interface WorkerExecutor {
  execute(workerId: string, goal: AgentGoal): Promise<WorkerExecutionResult>;
}
