import type { AgentGoal, AgentContext, AgentRuntime } from "@rmsm/ai-agents";
import { AgentStatus } from "@rmsm/ai-agents";
import type { WorkerExecutor } from "../repositories/worker-executor.interface";
import type { WorkerExecutionResult } from "../domain/entities/worker-execution-result.entity";

/** The one real `WorkerExecutor`: delegates straight to AI-401's own
 * `AgentRuntime.runSync`, mapping its `AgentRunResult` into this
 * package's `WorkerExecutionResult` shape. Requires the worker id to
 * already be a registered agent (with a config + reasoning strategy)
 * on the `AgentRuntime` passed in — this package only orchestrates,
 * it never registers or configures agents itself. */
export class AgentRuntimeWorkerExecutor implements WorkerExecutor {
  constructor(private readonly runtime: AgentRuntime) {}

  async execute(workerId: string, goal: AgentGoal): Promise<WorkerExecutionResult> {
    const context: AgentContext = { agentId: workerId, sessionId: null, goals: [goal], variables: {} };

    try {
      const runResult = await this.runtime.runSync(workerId, context);
      if (runResult.status === AgentStatus.COMPLETED) {
        return { success: true, output: runResult.output };
      }
      return { success: false, error: `Worker "${workerId}" run ended with status ${runResult.status}.` };
    } catch (error) {
      // Any failure mode of AgentRuntime (unregistered agent, unknown
      // strategy, MaxStepsExceededError, ...) is reported the same way
      // every other execution failure is, so DelegationService's
      // failure-recovery loop can treat it uniformly rather than needing
      // its own try/catch around every worker attempt.
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: `Worker "${workerId}" failed: ${message}` };
    }
  }
}
