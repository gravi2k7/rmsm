import type { ManualInterventionRepository } from "../repositories/manual-intervention-repository.interface";
import type { ManualIntervention } from "../domain/entities/manual-intervention.entity";

export class InMemoryManualInterventionRepository implements ManualInterventionRepository {
  private readonly byId = new Map<string, ManualIntervention>();

  async save(intervention: ManualIntervention): Promise<void> {
    this.byId.set(intervention.id, intervention);
  }

  async findById(id: string): Promise<ManualIntervention | null> {
    return this.byId.get(id) ?? null;
  }
}
