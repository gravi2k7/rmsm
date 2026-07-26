// AI-610: Executive AI Dashboard — AI insights, portfolio health,
// market/risk/signal/strategy summary, AI recommendations, executive
// KPIs, operational metrics, dashboard widgets. The final aggregation
// layer: composes REAL AI-601 (@rmsm/ai-market-intelligence), AI-602
// (@rmsm/ai-strategy-intelligence), AI-603 (@rmsm/ai-signal-intelligence),
// AI-604 (@rmsm/ai-portfolio-intelligence), and AI-605
// (@rmsm/ai-risk-intelligence) output into one dashboard snapshot —
// never recomputes any narrative, score, or recommendation itself, only
// wraps, relabels, and aggregates what those packages already produced.
// Integrates with AI-203 (@rmsm/ai-memory) for insight storage.

export { WidgetType, WIDGET_TYPES } from "./domain/enums/executive-dashboard.enum";

export type { DashboardWidget } from "./domain/entities/dashboard-widget.entity";
export type { ExecutiveKpi, ExecutiveKpiSet } from "./domain/entities/executive-kpi.entity";
export type { OperationalMetric } from "./domain/entities/operational-metric.entity";
export type { AggregatedRecommendation } from "./domain/entities/aggregated-recommendation.entity";
export type { ExecutiveDashboard } from "./domain/entities/executive-dashboard.entity";

export { NoRecommendationsSuppliedError } from "./domain/errors/executive-dashboard-domain.errors";

export type { ExecutiveDashboardDomainEvent, ExecutiveDashboardGeneratedEvent } from "./events/executive-dashboard-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { DashboardWidgetBuilderService } from "./application/services/dashboard-widget-builder.service";
export { ExecutiveKpiService } from "./application/services/executive-kpi.service";
export { OperationalMetricsService, type OperationalMetricsInput } from "./application/services/operational-metrics.service";
export { RecommendationAggregationService } from "./application/services/recommendation-aggregation.service";
export { ExecutiveDashboardService } from "./application/services/executive-dashboard.service";

export { InMemoryEventPublisher, type ExecutiveDashboardEventListener } from "./infrastructure/in-memory-event-publisher";
