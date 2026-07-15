import { ExecutionMetricsService } from "../execution-metrics.service";

describe("ExecutionMetricsService", () => {
  let metrics: ExecutionMetricsService;

  beforeEach(() => {
    metrics = new ExecutionMetricsService();
  });

  it("buildMetrics computes a real total, not a placeholder", () => {
    const result = metrics.buildMetrics(10, 20, 30, 40);
    expect(result).toEqual({ queueTimeMs: 10, validationTimeMs: 20, initializationTimeMs: 30, calculationTimeMs: 40, totalDurationMs: 100 });
  });

  it("snapshot starts at zero executions", () => {
    expect(metrics.snapshot()).toEqual({ totalExecutions: 0, averageDurationMs: 0 });
  });

  it("recordExecution accumulates real counters", () => {
    metrics.recordExecution(metrics.buildMetrics(0, 0, 0, 100));
    metrics.recordExecution(metrics.buildMetrics(0, 0, 0, 200));
    expect(metrics.snapshot()).toEqual({ totalExecutions: 2, averageDurationMs: 150 });
  });
});
