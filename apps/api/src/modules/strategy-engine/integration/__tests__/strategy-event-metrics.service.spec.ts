import { StrategyEventMetricsService } from "../services/strategy-event-metrics.service";

describe("StrategyEventMetricsService", () => {
  let metrics: StrategyEventMetricsService;

  beforeEach(() => {
    metrics = new StrategyEventMetricsService();
  });

  it("counts published events per event type", () => {
    metrics.recordEventPublished("StrategyCreated");
    metrics.recordEventPublished("StrategyCreated");
    metrics.recordEventPublished("StrategyArchived");
    expect(metrics.snapshot().counts).toEqual({ StrategyCreated: 2, StrategyArchived: 1 });
  });

  it("counts handler failures separately per event type", () => {
    metrics.recordHandlerFailure("StrategyPublished");
    metrics.recordHandlerFailure("StrategyPublished");
    expect(metrics.snapshot().failureCounts).toEqual({ StrategyPublished: 2 });
  });

  it("computes a real average latency per event type across multiple samples", () => {
    metrics.recordHandlerLatency("StrategyCreated", 10);
    metrics.recordHandlerLatency("StrategyCreated", 20);
    metrics.recordHandlerLatency("StrategyCreated", 30);
    expect(metrics.snapshot().averageLatencyMs.StrategyCreated).toBe(20);
  });

  it("tracks a real, cumulative retry count across every retry, regardless of event type", () => {
    metrics.recordRetry();
    metrics.recordRetry();
    metrics.recordRetry();
    expect(metrics.snapshot().retryCount).toBe(3);
  });

  it("returns a real snapshot copy, not a live reference — mutating the returned object doesn't affect internal state", () => {
    metrics.recordEventPublished("StrategyCreated");
    const snapshot = metrics.snapshot();
    snapshot.counts.StrategyCreated = 999;
    expect(metrics.snapshot().counts.StrategyCreated).toBe(1);
  });

  it("starts with an empty, real snapshot — not undefined or a placeholder", () => {
    const snapshot = metrics.snapshot();
    expect(snapshot.counts).toEqual({});
    expect(snapshot.failureCounts).toEqual({});
    expect(snapshot.averageLatencyMs).toEqual({});
    expect(snapshot.retryCount).toBe(0);
  });
});
