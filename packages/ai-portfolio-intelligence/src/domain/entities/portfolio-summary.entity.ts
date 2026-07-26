import type { PortfolioHealth } from "./portfolio-health.entity";
import type { DiversificationAnalysis } from "./diversification-analysis.entity";

export interface PortfolioSummary {
  readonly portfolioId: string;
  readonly health: PortfolioHealth;
  readonly diversification: DiversificationAnalysis;
  readonly narrative: string;
  readonly generatedAt: Date;
}
