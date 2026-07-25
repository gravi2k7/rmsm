import type { DomainEvent } from "@rmsm/core";

export interface PlanCreatedEvent extends DomainEvent {
  readonly kind: "PlanCreated";
  readonly planId: string;
  readonly goalId: string;
  readonly taskCount: number;
}

export interface PlanValidatedEvent extends DomainEvent {
  readonly kind: "PlanValidated";
  readonly planId: string;
  readonly valid: boolean;
  readonly errorCount: number;
}

export interface PlanReflectedEvent extends DomainEvent {
  readonly kind: "PlanReflected";
  readonly planId: string;
  readonly shouldReplan: boolean;
}

export interface PlanReplannedEvent extends DomainEvent {
  readonly kind: "PlanReplanned";
  readonly originalPlanId: string;
  readonly newPlanId: string;
}

export type PlanningDomainEvent = PlanCreatedEvent | PlanValidatedEvent | PlanReflectedEvent | PlanReplannedEvent;
