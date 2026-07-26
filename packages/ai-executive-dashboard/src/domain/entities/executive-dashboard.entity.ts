import type { DashboardWidget } from "./dashboard-widget.entity";
import type { ExecutiveKpiSet } from "./executive-kpi.entity";
import type { OperationalMetric } from "./operational-metric.entity";
import type { AggregatedRecommendation } from "./aggregated-recommendation.entity";

export interface ExecutiveDashboard {
  readonly portfolioId: string;
  readonly widgets: readonly DashboardWidget[];
  readonly kpis: ExecutiveKpiSet;
  readonly operationalMetrics: readonly OperationalMetric[];
  readonly recommendations: readonly AggregatedRecommendation[];
  readonly generatedAt: Date;
}
