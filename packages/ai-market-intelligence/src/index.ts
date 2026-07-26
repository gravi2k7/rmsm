// AI-601: Market Intelligence — regime detection, trend/momentum/
// volatility/structure/liquidity/session/multi-timeframe analysis,
// market summary generation, scoring, alerts, explanation. Computes
// simple statistics directly from @rmsm/market's own Candle aggregate;
// never reimplements the indicator-engine's named indicators (RSI,
// MACD, ...) — those are consumed, not computed, through
// IndicatorProvider. Integrates with @rmsm/ai-memory (AI-203) for
// insight storage/summarization.

export {
  TrendDirection,
  TREND_DIRECTIONS,
  VolatilityLevel,
  VOLATILITY_LEVELS,
  LiquidityLevel,
  LIQUIDITY_LEVELS,
  MarketStructure,
  MARKET_STRUCTURES,
  TradingSession,
  TRADING_SESSIONS,
  MarketRegime,
  MARKET_REGIMES,
  MarketAlertSeverity,
  MARKET_ALERT_SEVERITIES,
} from "./domain/enums/market-intelligence.enum";

export type { TrendAnalysis } from "./domain/entities/trend-analysis.entity";
export type { MomentumAnalysis } from "./domain/entities/momentum-analysis.entity";
export type { VolatilityAnalysis } from "./domain/entities/volatility-analysis.entity";
export type { MarketStructureAnalysis } from "./domain/entities/market-structure-analysis.entity";
export type { LiquidityAnalysis } from "./domain/entities/liquidity-analysis.entity";
export type { SessionAnalysis } from "./domain/entities/session-analysis.entity";
export type { MultiTimeframeAnalysis, TimeframeTrendSummary } from "./domain/entities/multi-timeframe-analysis.entity";
export type { RegimeAnalysis } from "./domain/entities/regime-analysis.entity";
export type { MarketScore } from "./domain/entities/market-score.entity";
export type { MarketAlert } from "./domain/entities/market-alert.entity";
export type { MarketSummary } from "./domain/entities/market-summary.entity";
export type { IndicatorReading } from "./domain/entities/indicator-reading.entity";

export { InsufficientCandlesError, EmptyTimeframeSetError } from "./domain/errors/market-intelligence-domain.errors";

export type { IndicatorProvider } from "./repositories/indicator-provider.interface";

export type {
  MarketIntelligenceDomainEvent,
  RegimeDetectedEvent,
  MarketAlertRaisedEvent,
  MarketSummaryGeneratedEvent,
} from "./events/market-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { MarketAnalysisService } from "./application/services/market-analysis.service";
export { MultiTimeframeAnalysisService } from "./application/services/multi-timeframe-analysis.service";
export { MarketRegimeService } from "./application/services/market-regime.service";
export { MarketScoringService } from "./application/services/market-scoring.service";
export { MarketAlertService } from "./application/services/market-alert.service";
export { MarketSummaryService } from "./application/services/market-summary.service";

export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
