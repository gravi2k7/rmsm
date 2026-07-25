import type { WorkflowExecutionRepository } from "../repositories/workflow-execution-repository.interface";
import type { WorkflowExecution } from "../domain/entities/workflow-execution.entity";

export class InMemoryWorkflowExecutionRepository implements WorkflowExecutionRepository {
  private readonly executions = new Map<string, WorkflowExecution>();

  async findById(id: string): Promise<WorkflowExecution | null> {
    return this.executions.get(id) ?? null;
  }

  async save(execution: WorkflowExecution): Promise<void> {
    this.executions.set(execution.id, execution);
  }
}
