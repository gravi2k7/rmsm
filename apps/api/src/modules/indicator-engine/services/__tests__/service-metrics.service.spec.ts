import { ServiceMetricsService } from "../service-metrics.service";

describe("ServiceMetricsService", () => {
  it("starts at all zeros", () => {
    expect(new ServiceMetricsService().snapshot()).toEqual({
      requestCount: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTimeMs: 0,
      validationFailures: 0,
      averagePlanningDurationMs: 0,
    });
  });

  it("accumulates real counters across multiple calls", () => {
    const metrics = new ServiceMetricsService();
    metrics.recordRequest();
    metrics.recordRequest();
    metrics.recordExecutionOutcome(true, 100);
    metrics.recordExecutionOutcome(false, 200);
    metrics.recordValidationFailure();
    metrics.recordPlanningDuration(50);

    const snapshot = metrics.snapshot();
    expect(snapshot.requestCount).toBe(2);
    expect(snapshot.successfulExecutions).toBe(1);
    expect(snapshot.failedExecutions).toBe(1);
    expect(snapshot.averageExecutionTimeMs).toBe(150);
    expect(snapshot.validationFailures).toBe(1);
    expect(snapshot.averagePlanningDurationMs).toBe(50);
  });
});
