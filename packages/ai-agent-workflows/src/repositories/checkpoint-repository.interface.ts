import type { WorkflowRunState } from "../domain/entities/workflow-run-state.entity";

export interface CheckpointRepository {
  save(state: WorkflowRunState): Promise<void>;
  findById(runId: string): Promise<WorkflowRunState | null>;
}
