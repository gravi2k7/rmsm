export interface BacktestInterpretedEvent {
  readonly eventId: string;
  readonly kind: "BacktestInterpreted";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly runId: string;
  readonly verdict: string;
}

export type BacktestIntelligenceDomainEvent = BacktestInterpretedEvent;
