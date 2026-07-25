import type { DelegationRepository } from "../repositories/delegation-repository.interface";
import type { DelegationTask } from "../domain/entities/delegation-task.entity";

export class InMemoryDelegationRepository implements DelegationRepository {
  private readonly byId = new Map<string, DelegationTask>();

  async save(task: DelegationTask): Promise<void> {
    this.byId.set(task.id, task);
  }

  async findById(id: string): Promise<DelegationTask | null> {
    return this.byId.get(id) ?? null;
  }
}
