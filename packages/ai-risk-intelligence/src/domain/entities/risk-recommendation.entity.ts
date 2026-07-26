import type { RiskRecommendationAction } from "../enums/risk-intelligence.enum";

export interface RiskRecommendation {
  readonly subjectId: string;
  readonly action: RiskRecommendationAction;
  readonly rationale: string;
}
