// AI-603: Signal Intelligence — quality analysis, ranking, explanation,
// filtering, duplicate detection, clustering, multi-timeframe
// confirmation, risk-adjusted scoring. Reads @rmsm/opportunity's own
// real Opportunity/Signal/ScoringService — never reimplements composite
// scoring. Reuses AI-601 (@rmsm/ai-market-intelligence) for
// multi-timeframe confirmation and AI-602 (@rmsm/ai-strategy-intelligence)
// for risk-adjusted scoring, and AI-203 (@rmsm/ai-memory) for insight
// storage/summarization.

export { SignalQualityVerdict, SIGNAL_QUALITY_VERDICTS } from "./domain/enums/signal-intelligence.enum";

export type { SignalQualityAssessment } from "./domain/entities/signal-quality-assessment.entity";
export type { SignalRanking, SignalRankingEntry } from "./domain/entities/signal-ranking.entity";
export type { SignalExplanation } from "./domain/entities/signal-explanation.entity";
export type { SignalFilterResult, ExcludedSignal } from "./domain/entities/signal-filter-result.entity";
export type { DuplicateSignalGroup } from "./domain/entities/duplicate-signal-group.entity";
export type { SignalCluster } from "./domain/entities/signal-cluster.entity";
export type { MultiTimeframeConfirmation } from "./domain/entities/multi-timeframe-confirmation.entity";
export type { RiskAdjustedScore } from "./domain/entities/risk-adjusted-score.entity";
export type { SignalIntelligenceReport } from "./domain/entities/signal-intelligence-report.entity";

export { EmptySignalSetError } from "./domain/errors/signal-intelligence-domain.errors";

export type {
  SignalIntelligenceDomainEvent,
  SignalQualityAssessedEvent,
  DuplicateSignalsDetectedEvent,
} from "./events/signal-intelligence-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { SignalQualityService } from "./application/services/signal-quality.service";
export { SignalRankingService } from "./application/services/signal-ranking.service";
export { SignalExplanationService } from "./application/services/signal-explanation.service";
export { SignalFilterService, type SignalFilterOptions } from "./application/services/signal-filter.service";
export { DuplicateSignalDetectionService } from "./application/services/duplicate-signal-detection.service";
export { SignalClusteringService } from "./application/services/signal-clustering.service";
export { MultiTimeframeConfirmationService } from "./application/services/multi-timeframe-confirmation.service";
export { RiskAdjustedScoringService } from "./application/services/risk-adjusted-scoring.service";
export { SignalIntelligenceReportService } from "./application/services/signal-intelligence-report.service";

export { InMemoryEventPublisher, type SignalIntelligenceEventListener } from "./infrastructure/in-memory-event-publisher";
