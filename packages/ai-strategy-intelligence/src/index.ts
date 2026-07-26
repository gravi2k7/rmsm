// AI-602: Strategy Intelligence — evaluation, comparison, recommendations,
// optimization suggestions, market suitability, performance analysis,
// confidence scoring, risk scoring, explanation, trade reasoning. Reads
// @rmsm/strategy's own Strategy aggregate (rules/versions/lifecycle/risk
// profile) and never reimplements rule evaluation — that stays behind
// @rmsm/strategy's own StrategyEngine port. Reuses AI-601
// (@rmsm/ai-market-intelligence) for market-context suitability checks,
// and AI-203 (@rmsm/ai-memory) for insight storage/summarization.

export {
  StrategyVerdict,
  STRATEGY_VERDICTS,
  StrategyRecommendationAction,
  STRATEGY_RECOMMENDATION_ACTIONS,
  SuitabilityLevel,
  SUITABILITY_LEVELS,
  RiskScoreBand,
  RISK_SCORE_BANDS,
} from "./domain/enums/strategy-intelligence.enum";

export type { StrategyEvaluation } from "./domain/entities/strategy-evaluation.entity";
export type { StrategyComparison, StrategyComparisonEntry } from "./domain/entities/strategy-comparison.entity";
export type { StrategyRecommendation } from "./domain/entities/strategy-recommendation.entity";
export type { OptimizationSuggestion } from "./domain/entities/optimization-suggestion.entity";
export type { MarketSuitability } from "./domain/entities/market-suitability.entity";
export type { StrategyPerformanceSummary } from "./domain/entities/strategy-performance-summary.entity";
export type { StrategyConfidenceScore } from "./domain/entities/strategy-confidence-score.entity";
export type { StrategyRiskScore } from "./domain/entities/strategy-risk-score.entity";
export type { StrategyExplanation } from "./domain/entities/strategy-explanation.entity";
export type { TradeReasoning } from "./domain/entities/trade-reasoning.entity";
export type { StrategyIntelligenceReport } from "./domain/entities/strategy-intelligence-report.entity";

export { InvalidComparisonSetError, StrategyHasNoVersionError } from "./domain/errors/strategy-intelligence-domain.errors";

export type { StrategyPerformanceProvider } from "./repositories/strategy-performance-provider.interface";

export type {
  StrategyIntelligenceDomainEvent,
  StrategyEvaluatedEvent,
  StrategyRecommendationIssuedEvent,
  MarketSuitabilityAssessedEvent,
} from "./events/strategy-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { StrategyEvaluationService } from "./application/services/strategy-evaluation.service";
export { StrategyRiskScoringService } from "./application/services/strategy-risk-scoring.service";
export { StrategyConfidenceScoringService } from "./application/services/strategy-confidence-scoring.service";
export { StrategyComparisonService } from "./application/services/strategy-comparison.service";
export { StrategyRecommendationService } from "./application/services/strategy-recommendation.service";
export { StrategyOptimizationSuggestionService } from "./application/services/strategy-optimization-suggestion.service";
export { MarketSuitabilityService } from "./application/services/market-suitability.service";
export { StrategyPerformanceAnalysisService } from "./application/services/strategy-performance-analysis.service";
export { StrategyExplanationService } from "./application/services/strategy-explanation.service";
export { TradeReasoningService } from "./application/services/trade-reasoning.service";
export { StrategyIntelligenceReportService } from "./application/services/strategy-intelligence-report.service";

export { InMemoryEventPublisher, type StrategyIntelligenceEventListener } from "./infrastructure/in-memory-event-publisher";
