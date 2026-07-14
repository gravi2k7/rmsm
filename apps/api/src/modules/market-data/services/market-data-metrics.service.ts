import { Injectable } from "@nestjs/common";

/**
 * In-memory counters, incremented from real events across every service
 * in this phase — the same honestly-scoped pattern as Module 005's
 * `NotificationMetricsService`: real numbers wired to real events, not a
 * decorative stub, but explicitly NOT presented as production-grade
 * monitoring. Counters reset on process restart and don't aggregate
 * across multiple `apps/api` instances — a real production deployment
 * needs a shared counter store or an actual metrics backend, which is an
 * infrastructure decision for whoever operates this, not guessed at
 * here. "Metrics hooks," per this phase's own wording — the hook points
 * are real; the aggregation/export backend is not this phase's job.
 */
@Injectable()
export class MarketDataMetricsService {
  private readonly counters = new Map<string, number>();

  increment(key: string, by = 1): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + by);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}
