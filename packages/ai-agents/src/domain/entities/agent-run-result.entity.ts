import type { AgentStatus } from "../enums/agent.enum";
import type { AgentStepResult } from "./agent-step-result.entity";

export interface AgentRunResult {
  readonly executionId: string;
  readonly agentId: string;
  readonly status: AgentStatus;
  readonly output: unknown;
  readonly steps: readonly AgentStepResult[];
  readonly startedAt: Date;
  readonly completedAt: Date;
}
