import type { PlanRepository } from "../repositories/plan-repository.interface";
import type { ExecutionPlan } from "../domain/entities/execution-plan.entity";

export class InMemoryPlanRepository implements PlanRepository {
  private readonly byId = new Map<string, ExecutionPlan>();

  async save(plan: ExecutionPlan): Promise<void> {
    this.byId.set(plan.id, plan);
  }

  async findById(id: string): Promise<ExecutionPlan | null> {
    return this.byId.get(id) ?? null;
  }
}
