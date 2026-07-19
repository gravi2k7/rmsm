import { Injectable } from "@nestjs/common";
import type { OpportunityRepository, Opportunity, OpportunityStatus } from "@rmsm/opportunity";

@Injectable()
export class InMemoryOpportunityRepository implements OpportunityRepository {
  private readonly opportunities = new Map<string, Opportunity>();

  async findById(id: string): Promise<Opportunity | null> {
    return this.opportunities.get(id) ?? null;
  }

  async findByStatus(status: OpportunityStatus): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values()).filter((o) => o.status === status);
  }

  async findPendingPastExpiry(asOf: Date): Promise<Opportunity[]> {
    return Array.from(this.opportunities.values()).filter((o) => o.status === "PENDING" && o.isPastExpiry(asOf));
  }

  async save(opportunity: Opportunity): Promise<void> {
    this.opportunities.set(opportunity.id, opportunity);
  }
}
