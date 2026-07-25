import type { ExecutionPlan } from "../domain/entities/execution-plan.entity";

export interface PlanRepository {
  save(plan: ExecutionPlan): Promise<void>;
  findById(id: string): Promise<ExecutionPlan | null>;
}
