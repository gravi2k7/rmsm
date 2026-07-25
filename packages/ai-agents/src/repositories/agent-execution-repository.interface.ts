import type { AgentExecutionState } from "../domain/entities/agent-execution-state.entity";

export interface AgentExecutionRepository {
  findById(executionId: string): Promise<AgentExecutionState | null>;
  save(state: AgentExecutionState): Promise<void>;
}
