import type { ResearchPlanRepository } from "../repositories/research-plan-repository.interface";
import type { ResearchPlan } from "../domain/entities/research-plan.entity";

export class InMemoryResearchPlanRepository implements ResearchPlanRepository {
  private readonly plans = new Map<string, ResearchPlan>();

  async findById(id: string): Promise<ResearchPlan | null> {
    return this.plans.get(id) ?? null;
  }

  async save(plan: ResearchPlan): Promise<void> {
    this.plans.set(plan.id, plan);
  }
}
