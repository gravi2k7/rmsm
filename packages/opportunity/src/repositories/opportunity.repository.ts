import type { Opportunity, OpportunityStatus } from "../entities/opportunity";

export interface OpportunityRepository {
  findById(id: string): Promise<Opportunity | null>;
  findByStatus(status: OpportunityStatus): Promise<Opportunity[]>;
  findPendingPastExpiry(asOf: Date): Promise<Opportunity[]>;
  save(opportunity: Opportunity): Promise<void>;
}
