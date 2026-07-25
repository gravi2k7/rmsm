export enum ResearchStepStatus {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

export const RESEARCH_STEP_STATUSES = Object.values(ResearchStepStatus) as readonly ResearchStepStatus[];

export enum ResearchPlanStatus {
  DRAFT = "draft",
  RUNNING = "running",
  COMPLETED = "completed",
}

export const RESEARCH_PLAN_STATUSES = Object.values(ResearchPlanStatus) as readonly ResearchPlanStatus[];
