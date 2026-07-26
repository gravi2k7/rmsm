import type { BacktestInterpretation } from "./backtest-interpretation.entity";
import type { PatternDetectionResult } from "./trade-pattern.entity";
import type { OptimizationRecommendation } from "./optimization-recommendation.entity";

export interface BacktestIntelligenceReport {
  readonly runId: string;
  readonly interpretation: BacktestInterpretation;
  readonly patterns: PatternDetectionResult;
  readonly recommendations: readonly OptimizationRecommendation[];
  readonly narrative: string;
  readonly generatedAt: Date;
}
