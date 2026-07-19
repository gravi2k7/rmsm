import { Injectable } from "@nestjs/common";
import type { DecisionRepository, Decision, DecisionStatus } from "@rmsm/decision";

@Injectable()
export class InMemoryDecisionRepository implements DecisionRepository {
  private readonly decisions = new Map<string, Decision>();

  async findById(id: string): Promise<Decision | null> {
    return this.decisions.get(id) ?? null;
  }

  async findByStatus(status: DecisionStatus): Promise<Decision[]> {
    return Array.from(this.decisions.values()).filter((d) => d.status === status);
  }

  async findByOpportunityId(opportunityId: string): Promise<Decision | null> {
    return Array.from(this.decisions.values()).find((d) => d.opportunityId === opportunityId) ?? null;
  }

  async save(decision: Decision): Promise<void> {
    this.decisions.set(decision.id, decision);
  }
}
