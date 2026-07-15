/** Item 11's own field list, exactly. "Metrics only, no monitoring implementation" — same honestly-scoped disposition as every metrics interface in this project since AI-101's MarketDataMetricsService. */
export interface ServiceMetricsSnapshot {
  requestCount: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTimeMs: number;
  validationFailures: number;
  averagePlanningDurationMs: number;
}
