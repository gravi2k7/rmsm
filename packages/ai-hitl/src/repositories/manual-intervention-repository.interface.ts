import type { ManualIntervention } from "../domain/entities/manual-intervention.entity";

export interface ManualInterventionRepository {
  save(intervention: ManualIntervention): Promise<void>;
  findById(id: string): Promise<ManualIntervention | null>;
}
