import type { PlanStatus } from "../enums/planning.enum";
import type { PlanTask } from "./plan-task.entity";

export interface ExecutionPlan {
  readonly id: string;
  readonly goalId: string;
  readonly goalDescription: string;
  readonly tasks: readonly PlanTask[];
  readonly status: PlanStatus;
  readonly parentPlanId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
