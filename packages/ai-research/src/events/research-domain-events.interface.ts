import type { DomainEvent } from "@rmsm/core";

export interface ResearchPlanCreatedEvent extends DomainEvent {
  readonly kind: "ResearchPlanCreated";
  readonly planId: string;
  readonly stepCount: number;
}

export interface EvidenceCollectedEvent extends DomainEvent {
  readonly kind: "EvidenceCollected";
  readonly planId: string;
  readonly stepId: string;
  readonly evidenceCount: number;
}

export interface ResearchSummarizedEvent extends DomainEvent {
  readonly kind: "ResearchSummarized";
  readonly planId: string;
}

export interface ResearchCompletedEvent extends DomainEvent {
  readonly kind: "ResearchCompleted";
  readonly planId: string;
  readonly citationCount: number;
}

export type ResearchDomainEvent =
  | ResearchPlanCreatedEvent
  | EvidenceCollectedEvent
  | ResearchSummarizedEvent
  | ResearchCompletedEvent;
