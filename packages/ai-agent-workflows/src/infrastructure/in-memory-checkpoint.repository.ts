import type { CheckpointRepository } from "../repositories/checkpoint-repository.interface";
import type { WorkflowRunState } from "../domain/entities/workflow-run-state.entity";

export class InMemoryCheckpointRepository implements CheckpointRepository {
  private readonly byId = new Map<string, WorkflowRunState>();

  async save(state: WorkflowRunState): Promise<void> {
    this.byId.set(state.runId, state);
  }

  async findById(runId: string): Promise<WorkflowRunState | null> {
    return this.byId.get(runId) ?? null;
  }
}
