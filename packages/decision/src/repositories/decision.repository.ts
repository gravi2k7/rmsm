import type { Decision, DecisionStatus } from "../entities/decision";

export interface DecisionRepository {
  findById(id: string): Promise<Decision | null>;
  findByStatus(status: DecisionStatus): Promise<Decision[]>;
  findByOpportunityId(opportunityId: string): Promise<Decision | null>;
  save(decision: Decision): Promise<void>;
}
