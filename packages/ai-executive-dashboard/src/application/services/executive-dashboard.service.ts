import type { Clock, IdGenerator } from "@rmsm/core";
import { MemoryType } from "@rmsm/ai-memory";
import type { MemoryService } from "@rmsm/ai-memory";
import type { DashboardWidget } from "../../domain/entities/dashboard-widget.entity";
import type { ExecutiveKpiSet } from "../../domain/entities/executive-kpi.entity";
import type { OperationalMetric } from "../../domain/entities/operational-metric.entity";
import type { AggregatedRecommendation } from "../../domain/entities/aggregated-recommendation.entity";
import type { ExecutiveDashboard } from "../../domain/entities/executive-dashboard.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ExecutiveDashboardGeneratedEvent } from "../../events/executive-dashboard-domain-events.interface";

/**
 * The flagship composing service — assembles widgets (from
 * `DashboardWidgetBuilderService`), KPIs (from `ExecutiveKpiService`),
 * operational metrics (from `OperationalMetricsService`), and
 * recommendations (from `RecommendationAggregationService`) — all
 * produced elsewhere in this package, themselves reading REAL AI-601..605
 * output — into one `ExecutiveDashboard`, never recomputing any of it.
 * When an AI-203 `MemoryService` is injected, every dashboard snapshot
 * is ALSO stored as a `MemoryType.SEMANTIC` entry.
 */
export class ExecutiveDashboardService {
  constructor(
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
    private readonly memoryService?: MemoryService,
  ) {}

  async generate(
    portfolioId: string,
    widgets: readonly DashboardWidget[],
    kpis: ExecutiveKpiSet,
    operationalMetrics: readonly OperationalMetric[],
    recommendations: readonly AggregatedRecommendation[],
  ): Promise<ExecutiveDashboard> {
    const now = this.clock.now();
    const dashboard: ExecutiveDashboard = { portfolioId, widgets, kpis, operationalMetrics, recommendations, generatedAt: now };

    if (this.memoryService) {
      const narrative = `Executive dashboard for ${portfolioId}: ${widgets.length} widget(s), ${kpis.kpis.length} KPI(s), ${recommendations.length} recommendation(s).`;
      await this.memoryService.store({
        type: MemoryType.SEMANTIC,
        content: narrative,
        metadata: { tags: ["executive-dashboard", portfolioId], source: "ai-executive-dashboard", author: "ExecutiveDashboardService" },
      });
    }

    if (this.eventPublisher) {
      const event: ExecutiveDashboardGeneratedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "ExecutiveDashboardGenerated",
        occurredAt: now,
        aggregateId: portfolioId,
        portfolioId,
        widgetCount: widgets.length,
      };
      await this.eventPublisher.publish([event]);
    }

    return dashboard;
  }
}
