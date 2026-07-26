import type { OperationalMetric } from "../../domain/entities/operational-metric.entity";

export interface OperationalMetricsInput {
  readonly openPositionsCount: number;
  readonly activeAlertsCount: number;
  readonly pendingRecommendationsCount: number;
}

/** Wraps already-known counts (open positions, active alerts, pending
 * recommendations — each read from REAL upstream AI-6xx output by the
 * caller) into a uniform metric list — no counting logic of its own. */
export class OperationalMetricsService {
  build(input: OperationalMetricsInput): readonly OperationalMetric[] {
    return [
      { name: "Open Positions", value: input.openPositionsCount },
      { name: "Active Alerts", value: input.activeAlertsCount },
      { name: "Pending Recommendations", value: input.pendingRecommendationsCount },
    ];
  }
}
