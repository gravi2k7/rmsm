import type { WorkflowExecution } from "../domain/entities/workflow-execution.entity";

export interface WorkflowExecutionRepository {
  findById(id: string): Promise<WorkflowExecution | null>;
  save(execution: WorkflowExecution): Promise<void>;
}
