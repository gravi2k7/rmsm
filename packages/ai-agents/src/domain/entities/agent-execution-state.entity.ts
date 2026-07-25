import type { AgentStatus } from "../enums/agent.enum";

/** The "Agent execution state" + "Agent lifecycle" capability's live
 * record of one run — what `AgentRuntime.getStatus()` returns for an
 * async/long-running execution while it's still in flight. */
export interface AgentExecutionState {
  readonly executionId: string;
  readonly agentId: string;
  readonly status: AgentStatus;
  readonly currentStepIndex: number;
  readonly startedAt: Date;
  readonly completedAt: Date | null;
  readonly error?: string;
}
