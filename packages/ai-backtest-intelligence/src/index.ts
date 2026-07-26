// AI-607: Backtesting Intelligence — backtest interpretation,
// performance summaries, trade distribution analysis, winning/losing
// pattern detection, optimization recommendations, strategy comparison,
// natural language explanations. Reads @rmsm/portfolio's own real
// Trade/PerformanceMetrics (from PerformanceService.computeMetrics())
// — never reimplements win rate, profit factor, Sharpe ratio, or
// drawdown. Integrates with AI-203 (@rmsm/ai-memory) for insight
// storage/summarization.

export { BacktestVerdict, BACKTEST_VERDICTS, TradePatternType, TRADE_PATTERN_TYPES } from "./domain/enums/backtest-intelligence.enum";

export type { BacktestRun } from "./domain/entities/backtest-run.entity";
export type { BacktestInterpretation } from "./domain/entities/backtest-interpretation.entity";
export type { PerformanceSummary } from "./domain/entities/performance-summary.entity";
export type { TradeDistributionAnalysis, DistributionBucket } from "./domain/entities/trade-distribution-analysis.entity";
export type { TradePattern, PatternDetectionResult } from "./domain/entities/trade-pattern.entity";
export type { OptimizationRecommendation } from "./domain/entities/optimization-recommendation.entity";
export type { BacktestComparison, BacktestComparisonEntry } from "./domain/entities/backtest-comparison.entity";
export type { NaturalLanguageExplanation } from "./domain/entities/natural-language-explanation.entity";
export type { BacktestIntelligenceReport } from "./domain/entities/backtest-intelligence-report.entity";

export { EmptyTradeSetError, InvalidComparisonSetError } from "./domain/errors/backtest-intelligence-domain.errors";

export type { BacktestIntelligenceDomainEvent, BacktestInterpretedEvent } from "./events/backtest-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { BacktestInterpretationService } from "./application/services/backtest-interpretation.service";
export { PerformanceSummaryService } from "./application/services/performance-summary.service";
export { TradeDistributionAnalysisService } from "./application/services/trade-distribution-analysis.service";
export { PatternDetectionService } from "./application/services/pattern-detection.service";
export { OptimizationRecommendationService } from "./application/services/optimization-recommendation.service";
export { BacktestComparisonService, type BacktestComparisonInput } from "./application/services/backtest-comparison.service";
export { BacktestExplanationService } from "./application/services/backtest-explanation.service";
export { BacktestIntelligenceReportService } from "./application/services/backtest-intelligence-report.service";

export { InMemoryEventPublisher, type BacktestIntelligenceEventListener } from "./infrastructure/in-memory-event-publisher";
