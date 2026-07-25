import type { DomainEvent } from "@rmsm/core";

export interface RoleAssignedEvent extends DomainEvent {
  readonly kind: "RoleAssigned";
  readonly actorId: string;
  readonly roleName: string;
}

export interface AccessGrantedEvent extends DomainEvent {
  readonly kind: "AccessGranted";
  readonly actorId: string;
  readonly action: string;
  readonly resource: string;
}

export interface AccessDeniedEvent extends DomainEvent {
  readonly kind: "AccessDenied";
  readonly actorId: string;
  readonly action: string;
  readonly resource: string;
  readonly reason: string;
}

export interface RateLimitExceededEvent extends DomainEvent {
  readonly kind: "RateLimitExceeded";
  readonly key: string;
}

export type AgentSecurityDomainEvent = RoleAssignedEvent | AccessGrantedEvent | AccessDeniedEvent | RateLimitExceededEvent;
