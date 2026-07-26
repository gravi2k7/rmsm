export interface PortfolioHealthAssessedEvent {
  readonly eventId: string;
  readonly kind: "PortfolioHealthAssessed";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly portfolioId: string;
  readonly verdict: string;
}

export interface PortfolioRecommendationIssuedEvent {
  readonly eventId: string;
  readonly kind: "PortfolioRecommendationIssued";
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly portfolioId: string;
  readonly action: string;
}

export type PortfolioIntelligenceDomainEvent = PortfolioHealthAssessedEvent | PortfolioRecommendationIssuedEvent;
