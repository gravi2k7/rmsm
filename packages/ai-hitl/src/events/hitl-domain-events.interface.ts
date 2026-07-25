import type { DomainEvent } from "@rmsm/core";

export interface ApprovalRequestedEvent extends DomainEvent {
  readonly kind: "ApprovalRequested";
  readonly requestId: string;
  readonly agentId: string;
  readonly queueName: string;
}

export interface ApprovalGrantedEvent extends DomainEvent {
  readonly kind: "ApprovalGranted";
  readonly requestId: string;
  readonly resolvedBy: string;
}

export interface ApprovalRejectedEvent extends DomainEvent {
  readonly kind: "ApprovalRejected";
  readonly requestId: string;
  readonly resolvedBy: string;
}

export interface ApprovalEscalatedEvent extends DomainEvent {
  readonly kind: "ApprovalEscalated";
  readonly requestId: string;
  readonly escalatedTo: string;
}

export interface InterventionRequestedEvent extends DomainEvent {
  readonly kind: "InterventionRequested";
  readonly interventionId: string;
  readonly agentId: string;
}

export interface InterventionResolvedEvent extends DomainEvent {
  readonly kind: "InterventionResolved";
  readonly interventionId: string;
}

export interface FeedbackSubmittedEvent extends DomainEvent {
  readonly kind: "FeedbackSubmitted";
  readonly feedbackId: string;
  readonly subjectId: string;
}

export interface DecisionRecordedEvent extends DomainEvent {
  readonly kind: "DecisionRecorded";
  readonly recordId: string;
  readonly subjectId: string;
}

export type HitlDomainEvent =
  | ApprovalRequestedEvent
  | ApprovalGrantedEvent
  | ApprovalRejectedEvent
  | ApprovalEscalatedEvent
  | InterventionRequestedEvent
  | InterventionResolvedEvent
  | FeedbackSubmittedEvent
  | DecisionRecordedEvent;
