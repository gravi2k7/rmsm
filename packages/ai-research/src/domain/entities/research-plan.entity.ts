import type { ResearchPlanStatus } from "../enums/research.enum";
import type { ResearchStep } from "./research-step.entity";

export interface ResearchPlan {
  readonly id: string;
  readonly topic: string;
  readonly status: ResearchPlanStatus;
  readonly steps: readonly ResearchStep[];
  readonly createdAt: Date;
}
