import type { DelegationTask } from "../domain/entities/delegation-task.entity";

export interface DelegationRepository {
  save(task: DelegationTask): Promise<void>;
  findById(id: string): Promise<DelegationTask | null>;
}
