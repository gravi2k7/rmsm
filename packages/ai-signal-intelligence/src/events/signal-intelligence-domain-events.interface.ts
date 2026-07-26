export interface SignalQualityAssessedEvent {
  readonly eventId: string;
  readonly kind: "SignalQualityAssessed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly opportunityId: string;
  readonly verdict: string;
}

export interface DuplicateSignalsDetectedEvent {
  readonly eventId: string;
  readonly kind: "DuplicateSignalsDetected";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly symbolCode: string;
  readonly direction: string;
  readonly opportunityIds: readonly string[];
}

export type SignalIntelligenceDomainEvent = SignalQualityAssessedEvent | DuplicateSignalsDetectedEvent;
