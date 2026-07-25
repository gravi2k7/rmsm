export enum AgentRunOutcome {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export const AGENT_RUN_OUTCOMES = Object.values(AgentRunOutcome) as readonly AgentRunOutcome[];

export enum ToolOutcome {
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  TIMED_OUT = "TIMED_OUT",
}

export const TOOL_OUTCOMES = Object.values(ToolOutcome) as readonly ToolOutcome[];

export enum WorkflowRunOutcome {
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export const WORKFLOW_RUN_OUTCOMES = Object.values(WorkflowRunOutcome) as readonly WorkflowRunOutcome[];
