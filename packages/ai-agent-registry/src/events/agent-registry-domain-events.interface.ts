import type { DomainEvent } from "@rmsm/core";

export interface AgentRegisteredEvent extends DomainEvent {
  readonly kind: "AgentRegistered";
  readonly agentId: string;
}

export interface AgentVersionPublishedEvent extends DomainEvent {
  readonly kind: "AgentVersionPublished";
  readonly agentId: string;
  readonly version: string;
}

export interface AgentVersionActivatedEvent extends DomainEvent {
  readonly kind: "AgentVersionActivated";
  readonly agentId: string;
  readonly version: string;
}

export interface AgentVersionDeprecatedEvent extends DomainEvent {
  readonly kind: "AgentVersionDeprecated";
  readonly agentId: string;
  readonly version: string;
}

export interface AgentVersionRetiredEvent extends DomainEvent {
  readonly kind: "AgentVersionRetired";
  readonly agentId: string;
  readonly version: string;
}

export type AgentRegistryDomainEvent =
  | AgentRegisteredEvent
  | AgentVersionPublishedEvent
  | AgentVersionActivatedEvent
  | AgentVersionDeprecatedEvent
  | AgentVersionRetiredEvent;
