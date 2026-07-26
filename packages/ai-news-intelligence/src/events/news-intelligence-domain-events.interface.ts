export interface NewsAnalyzedEvent {
  readonly eventId: string;
  readonly kind: "NewsAnalyzed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly articleId: string;
  readonly sentimentLabel: string;
  readonly impactLevel: string;
}

export type NewsIntelligenceDomainEvent = NewsAnalyzedEvent;
