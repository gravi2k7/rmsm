/** Collects REAL `StrategyRecommendation` (AI-602), `PortfolioRecommendation`
 * (AI-604), and `RiskRecommendation` (AI-605) objects into one tagged
 * list — never a fourth, independent recommendation calculation. */
export interface AggregatedRecommendation {
  readonly source: string;
  readonly action: string;
  readonly rationale: string;
}
