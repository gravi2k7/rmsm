import type { AgentExecutionRepository } from "../repositories/agent-execution-repository.interface";
import type { AgentExecutionState } from "../domain/entities/agent-execution-state.entity";

export class InMemoryAgentExecutionRepository implements AgentExecutionRepository {
  private readonly executions = new Map<string, AgentExecutionState>();

  async findById(executionId: string): Promise<AgentExecutionState | null> {
    return this.executions.get(executionId) ?? null;
  }

  async save(state: AgentExecutionState): Promise<void> {
    this.executions.set(state.executionId, state);
  }
}
