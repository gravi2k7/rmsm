export interface RiskAnalyzedEvent {
  readonly eventId: string;
  readonly kind: "RiskAnalyzed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly subjectId: string;
  readonly verdict: string;
}

export interface RiskAlertRaisedEvent {
  readonly eventId: string;
  readonly kind: "RiskAlertRaised";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly subjectId: string;
  readonly severity: string;
  readonly code: string;
}

export type RiskIntelligenceDomainEvent = RiskAnalyzedEvent | RiskAlertRaisedEvent;
