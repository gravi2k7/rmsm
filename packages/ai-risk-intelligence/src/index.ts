// AI-605: Risk Intelligence — risk analysis, drawdown analysis, exposure
// monitoring, correlation analysis, position/trade/portfolio risk,
// stress scenarios, risk alerts, AI recommendations. Reads
// @rmsm/decision's own real RiskAssessment/RiskScore and
// @rmsm/portfolio's own real Portfolio/Position/Trade/Exposure/
// PerformanceService — never reimplements the five pre-execution risk
// checks, exposure math, or performance metrics. Integrates with AI-203
// (@rmsm/ai-memory) for insight storage/summarization.

export {
  RiskVerdict,
  RISK_VERDICTS,
  CorrelationLevel,
  CORRELATION_LEVELS,
  RiskAlertSeverity,
  RISK_ALERT_SEVERITIES,
  RiskRecommendationAction,
  RISK_RECOMMENDATION_ACTIONS,
} from "./domain/enums/risk-intelligence.enum";

export type { RiskAnalysis } from "./domain/entities/risk-analysis.entity";
export type { DrawdownAnalysis } from "./domain/entities/drawdown-analysis.entity";
export type { ExposureMonitoringResult, MonitoredExposure } from "./domain/entities/exposure-monitoring-result.entity";
export type { CorrelationAnalysis, SymbolCorrelation } from "./domain/entities/correlation-analysis.entity";
export type { PositionRisk } from "./domain/entities/position-risk.entity";
export type { TradeRisk } from "./domain/entities/trade-risk.entity";
export type { PortfolioRiskSummary } from "./domain/entities/portfolio-risk-summary.entity";
export type { StressScenarioResult } from "./domain/entities/stress-scenario-result.entity";
export type { RiskAlert } from "./domain/entities/risk-alert.entity";
export type { RiskRecommendation } from "./domain/entities/risk-recommendation.entity";
export type { RiskIntelligenceReport } from "./domain/entities/risk-intelligence-report.entity";

export { EmptyCorrelationSetError, EmptyStressScenarioSetError } from "./domain/errors/risk-intelligence-domain.errors";

export type { RiskIntelligenceDomainEvent, RiskAnalyzedEvent, RiskAlertRaisedEvent } from "./events/risk-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { RiskAnalysisService } from "./application/services/risk-analysis.service";
export { DrawdownAnalysisService } from "./application/services/drawdown-analysis.service";
export { ExposureMonitoringService, type MonitoredExposureInput } from "./application/services/exposure-monitoring.service";
export { CorrelationAnalysisService, type RawCorrelation } from "./application/services/correlation-analysis.service";
export { PositionRiskService } from "./application/services/position-risk.service";
export { TradeRiskService } from "./application/services/trade-risk.service";
export { PortfolioRiskSummaryService } from "./application/services/portfolio-risk-summary.service";
export { StressScenarioService, type StressScenarioInput } from "./application/services/stress-scenario.service";
export { RiskAlertService } from "./application/services/risk-alert.service";
export { RiskRecommendationService } from "./application/services/risk-recommendation.service";
export { RiskIntelligenceReportService } from "./application/services/risk-intelligence-report.service";

export { InMemoryEventPublisher, type RiskIntelligenceEventListener } from "./infrastructure/in-memory-event-publisher";
