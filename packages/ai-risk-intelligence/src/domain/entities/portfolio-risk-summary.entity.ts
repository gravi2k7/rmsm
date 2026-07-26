import type { RiskVerdict } from "../enums/risk-intelligence.enum";

export interface PortfolioRiskSummary {
  readonly portfolioId: string;
  readonly overallScore: number;
  readonly verdict: RiskVerdict;
  readonly componentScores: Readonly<Record<string, number>>;
}
