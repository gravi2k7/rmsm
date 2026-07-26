import type { RiskAnalysis } from "./risk-analysis.entity";
import type { DrawdownAnalysis } from "./drawdown-analysis.entity";
import type { RiskAlert } from "./risk-alert.entity";
import type { RiskRecommendation } from "./risk-recommendation.entity";

export interface RiskIntelligenceReport {
  readonly subjectId: string;
  readonly riskAnalysis: RiskAnalysis;
  readonly drawdownAnalysis: DrawdownAnalysis;
  readonly alerts: readonly RiskAlert[];
  readonly recommendation: RiskRecommendation;
  readonly narrative: string;
  readonly generatedAt: Date;
}
