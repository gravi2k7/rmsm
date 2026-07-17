import { Injectable } from "@nestjs/common";

/**
 * Real, in-memory aggregate counters — the same honestly-scoped,
 * single-instance pattern every metrics service in this platform has
 * used since AI-102's own `ServiceMetricsService`/`ExecutionMetricsService`.
 * Covers this milestone's own explicit "Metrics" list: creation,
 * publication, approval, validation, clone, rollback, failures,
 * latency, event queue size (read from the outbox repository directly
 * by whoever exposes this — not duplicated here), retry count.
 */
@Injectable()
export class StrategyEventMetricsService {
  private counts: Record<string, number> = {};
  private failureCounts: Record<string, number> = {};
  private latenciesMs: Record<string, number[]> = {};
  private retryCount = 0;

  recordEventPublished(eventType: string): void {
    this.counts[eventType] = (this.counts[eventType] ?? 0) + 1;
  }

  recordHandlerFailure(eventType: string): void {
    this.failureCounts[eventType] = (this.failureCounts[eventType] ?? 0) + 1;
  }

  recordHandlerLatency(eventType: string, durationMs: number): void {
    const existing = this.latenciesMs[eventType] ?? [];
    existing.push(durationMs);
    this.latenciesMs[eventType] = existing;
  }

  recordRetry(): void {
    this.retryCount += 1;
  }

  snapshot(): { counts: Record<string, number>; failureCounts: Record<string, number>; averageLatencyMs: Record<string, number>; retryCount: number } {
    const averageLatencyMs: Record<string, number> = {};
    for (const [eventType, samples] of Object.entries(this.latenciesMs)) {
      averageLatencyMs[eventType] = samples.length === 0 ? 0 : samples.reduce((a, b) => a + b, 0) / samples.length;
    }
    return { counts: { ...this.counts }, failureCounts: { ...this.failureCounts }, averageLatencyMs, retryCount: this.retryCount };
  }
}
