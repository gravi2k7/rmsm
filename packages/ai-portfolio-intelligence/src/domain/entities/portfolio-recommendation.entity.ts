import type { PortfolioRecommendationAction } from "../enums/portfolio-intelligence.enum";

export interface PortfolioRecommendation {
  readonly portfolioId: string;
  readonly action: PortfolioRecommendationAction;
  readonly rationale: string;
}
