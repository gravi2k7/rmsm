import type { DomainEvent } from "@rmsm/core";

export interface AgentStartedEvent extends DomainEvent {
  readonly kind: "AgentStarted";
  readonly executionId: string;
  readonly agentId: string;
}

export interface AgentStepCompletedEvent extends DomainEvent {
  readonly kind: "AgentStepCompleted";
  readonly executionId: string;
  readonly agentId: string;
  readonly stepIndex: number;
}

export interface AgentCompletedEvent extends DomainEvent {
  readonly kind: "AgentCompleted";
  readonly executionId: string;
  readonly agentId: string;
}

export interface AgentFailedEvent extends DomainEvent {
  readonly kind: "AgentFailed";
  readonly executionId: string;
  readonly agentId: string;
  readonly error: string;
}

export interface AgentCancelledEvent extends DomainEvent {
  readonly kind: "AgentCancelled";
  readonly executionId: string;
  readonly agentId: string;
}

export type AgentDomainEvent =
  | AgentStartedEvent
  | AgentStepCompletedEvent
  | AgentCompletedEvent
  | AgentFailedEvent
  | AgentCancelledEvent;
