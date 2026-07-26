import { describe, expect, it } from "vitest";
import { OperationalMetricsService } from "../services/operational-metrics.service";

describe("OperationalMetricsService", () => {
  it("wraps supplied counts into a uniform metric list", () => {
    const metrics = new OperationalMetricsService().build({ openPositionsCount: 3, activeAlertsCount: 1, pendingRecommendationsCount: 2 });
    expect(metrics).toEqual([
      { name: "Open Positions", value: 3 },
      { name: "Active Alerts", value: 1 },
      { name: "Pending Recommendations", value: 2 },
    ]);
  });
});
