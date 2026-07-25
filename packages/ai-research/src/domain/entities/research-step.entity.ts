import type { ResearchStepStatus } from "../enums/research.enum";

export interface ResearchStep {
  readonly id: string;
  readonly planId: string;
  readonly query: string;
  readonly status: ResearchStepStatus;
}
