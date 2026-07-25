import type { DomainEvent } from "@rmsm/core";

export interface WorkflowStartedEvent extends DomainEvent {
  readonly kind: "WorkflowStarted";
  readonly executionId: string;
  readonly workflowId: string;
}

export interface StepStartedEvent extends DomainEvent {
  readonly kind: "StepStarted";
  readonly executionId: string;
  readonly stepId: string;
}

export interface StepRetriedEvent extends DomainEvent {
  readonly kind: "StepRetried";
  readonly executionId: string;
  readonly stepId: string;
  readonly attempt: number;
}

export interface StepSucceededEvent extends DomainEvent {
  readonly kind: "StepSucceeded";
  readonly executionId: string;
  readonly stepId: string;
}

export interface StepFailedEvent extends DomainEvent {
  readonly kind: "StepFailed";
  readonly executionId: string;
  readonly stepId: string;
  readonly error: string;
}

export interface StepSkippedEvent extends DomainEvent {
  readonly kind: "StepSkipped";
  readonly executionId: string;
  readonly stepId: string;
  readonly reason: string;
}

export interface StepTimedOutEvent extends DomainEvent {
  readonly kind: "StepTimedOut";
  readonly executionId: string;
  readonly stepId: string;
}

export interface WorkflowCompletedEvent extends DomainEvent {
  readonly kind: "WorkflowCompleted";
  readonly executionId: string;
}

export interface WorkflowFailedEvent extends DomainEvent {
  readonly kind: "WorkflowFailed";
  readonly executionId: string;
}

export interface WorkflowCancelledEvent extends DomainEvent {
  readonly kind: "WorkflowCancelled";
  readonly executionId: string;
}

export type WorkflowDomainEvent =
  | WorkflowStartedEvent
  | StepStartedEvent
  | StepRetriedEvent
  | StepSucceededEvent
  | StepFailedEvent
  | StepSkippedEvent
  | StepTimedOutEvent
  | WorkflowCompletedEvent
  | WorkflowFailedEvent
  | WorkflowCancelledEvent;
