import type { DomainEvent } from "@rmsm/core";

export interface WorkflowRunStartedEvent extends DomainEvent {
  readonly kind: "WorkflowRunStarted";
  readonly runId: string;
  readonly workflowId: string;
}

export interface WorkflowCheckpointedEvent extends DomainEvent {
  readonly kind: "WorkflowCheckpointed";
  readonly runId: string;
  readonly completedStepCount: number;
  readonly failedStepCount: number;
}

export interface WorkflowRunCompletedEvent extends DomainEvent {
  readonly kind: "WorkflowRunCompleted";
  readonly runId: string;
}

export interface WorkflowRunFailedEvent extends DomainEvent {
  readonly kind: "WorkflowRunFailed";
  readonly runId: string;
}

export interface WorkflowRunCancelledEvent extends DomainEvent {
  readonly kind: "WorkflowRunCancelled";
  readonly runId: string;
}

export interface WorkflowRunRetriedEvent extends DomainEvent {
  readonly kind: "WorkflowRunRetried";
  readonly originalRunId: string;
  readonly newRunId: string;
}

export type AgentWorkflowDomainEvent =
  | WorkflowRunStartedEvent
  | WorkflowCheckpointedEvent
  | WorkflowRunCompletedEvent
  | WorkflowRunFailedEvent
  | WorkflowRunCancelledEvent
  | WorkflowRunRetriedEvent;
