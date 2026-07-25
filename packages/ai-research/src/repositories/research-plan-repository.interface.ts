import type { ResearchPlan } from "../domain/entities/research-plan.entity";

export interface ResearchPlanRepository {
  findById(id: string): Promise<ResearchPlan | null>;
  save(plan: ResearchPlan): Promise<void>;
}
