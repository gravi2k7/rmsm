import type { DomainEvent } from "@rmsm/core";

export interface WorkerRegisteredEvent extends DomainEvent {
  readonly kind: "WorkerRegistered";
  readonly workerId: string;
}

export interface TaskDelegatedEvent extends DomainEvent {
  readonly kind: "TaskDelegated";
  readonly delegationId: string;
  readonly coordinatorId: string;
  readonly workerId: string;
}

export interface DelegationCompletedEvent extends DomainEvent {
  readonly kind: "DelegationCompleted";
  readonly delegationId: string;
  readonly workerId: string;
}

export interface DelegationFailedEvent extends DomainEvent {
  readonly kind: "DelegationFailed";
  readonly delegationId: string;
  readonly workerId: string;
  readonly error: string;
}

export interface DelegationReassignedEvent extends DomainEvent {
  readonly kind: "DelegationReassigned";
  readonly delegationId: string;
  readonly fromWorkerId: string;
  readonly toWorkerId: string;
}

export interface ContextSharedEvent extends DomainEvent {
  readonly kind: "ContextShared";
  readonly key: string;
  readonly updatedBy: string;
}

export interface AgentMessageSentEvent extends DomainEvent {
  readonly kind: "AgentMessageSent";
  readonly fromAgentId: string;
  readonly toAgentId: string;
}

export interface ConsensusReachedEvent extends DomainEvent {
  readonly kind: "ConsensusReached";
  readonly proposalId: string;
  readonly approved: boolean;
}

export type OrchestrationDomainEvent =
  | WorkerRegisteredEvent
  | TaskDelegatedEvent
  | DelegationCompletedEvent
  | DelegationFailedEvent
  | DelegationReassignedEvent
  | ContextSharedEvent
  | AgentMessageSentEvent
  | ConsensusReachedEvent;
