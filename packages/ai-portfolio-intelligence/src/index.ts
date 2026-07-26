// AI-604: Portfolio Intelligence — health, allocation, diversification,
// exposure analysis, performance attribution, recommendations,
// optimization suggestions, rebalancing suggestions, portfolio summary.
// Reads @rmsm/portfolio's own real Portfolio/Trade/PerformanceMetrics/
// Exposure — never reimplements P&L, win rate, Sharpe ratio, drawdown,
// or exposure calculations, all of which stay owned by
// PerformanceService/RiskMonitorService. Integrates with AI-203
// (@rmsm/ai-memory) for insight storage/summarization.

export {
  PortfolioHealthVerdict,
  PORTFOLIO_HEALTH_VERDICTS,
  DiversificationLevel,
  DIVERSIFICATION_LEVELS,
  PortfolioRecommendationAction,
  PORTFOLIO_RECOMMENDATION_ACTIONS,
  RebalanceAction,
  REBALANCE_ACTIONS,
} from "./domain/enums/portfolio-intelligence.enum";

export type { PortfolioHealth } from "./domain/entities/portfolio-health.entity";
export type { AllocationBreakdown, AllocationEntry } from "./domain/entities/allocation-breakdown.entity";
export type { DiversificationAnalysis } from "./domain/entities/diversification-analysis.entity";
export type { ExposureAnalysisResult } from "./domain/entities/exposure-analysis-result.entity";
export type { PerformanceAttribution, SymbolAttribution } from "./domain/entities/performance-attribution.entity";
export type { PortfolioRecommendation } from "./domain/entities/portfolio-recommendation.entity";
export type { OptimizationSuggestion } from "./domain/entities/optimization-suggestion.entity";
export type { RebalancingSuggestion } from "./domain/entities/rebalancing-suggestion.entity";
export type { PortfolioSummary } from "./domain/entities/portfolio-summary.entity";

export { EmptyExposureSetError } from "./domain/errors/portfolio-intelligence-domain.errors";

export type {
  PortfolioIntelligenceDomainEvent,
  PortfolioHealthAssessedEvent,
  PortfolioRecommendationIssuedEvent,
} from "./events/portfolio-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { PortfolioHealthService } from "./application/services/portfolio-health.service";
export { AllocationAnalysisService, type SymbolExposure } from "./application/services/allocation-analysis.service";
export { DiversificationAnalysisService } from "./application/services/diversification-analysis.service";
export { ExposureAnalysisService } from "./application/services/exposure-analysis.service";
export { PerformanceAttributionService } from "./application/services/performance-attribution.service";
export { PortfolioRecommendationService } from "./application/services/portfolio-recommendation.service";
export { PortfolioOptimizationSuggestionService } from "./application/services/portfolio-optimization-suggestion.service";
export { RebalancingSuggestionService } from "./application/services/rebalancing-suggestion.service";
export { PortfolioSummaryService } from "./application/services/portfolio-summary.service";

export { InMemoryEventPublisher, type PortfolioIntelligenceEventListener } from "./infrastructure/in-memory-event-publisher";
