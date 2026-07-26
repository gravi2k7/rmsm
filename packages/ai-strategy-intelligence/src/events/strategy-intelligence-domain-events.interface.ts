export interface StrategyEvaluatedEvent {
  readonly eventId: string;
  readonly kind: "StrategyEvaluated";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly strategyId: string;
  readonly verdict: string;
}

export interface StrategyRecommendationIssuedEvent {
  readonly eventId: string;
  readonly kind: "StrategyRecommendationIssued";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly strategyId: string;
  readonly action: string;
}

export interface MarketSuitabilityAssessedEvent {
  readonly eventId: string;
  readonly kind: "MarketSuitabilityAssessed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly strategyId: string;
  readonly symbolCode: string;
  readonly level: string;
}

export type StrategyIntelligenceDomainEvent =
  | StrategyEvaluatedEvent
  | StrategyRecommendationIssuedEvent
  | MarketSuitabilityAssessedEvent;
