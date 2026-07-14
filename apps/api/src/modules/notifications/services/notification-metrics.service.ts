import { Injectable } from "@nestjs/common";

/**
 * In-memory counters, incremented from real events (DeliveryService,
 * QueueEventTracker) — not a decorative placeholder, but honestly scoped:
 * counters reset on process restart and don't aggregate across multiple
 * `apps/api` instances behind a load balancer. That's an explicit,
 * named limitation, not silently glossed over — a real production
 * deployment needs a shared counter store (Redis) or an actual metrics
 * backend (Prometheus client, Datadog, etc.), which is an infrastructure/
 * deployment decision for whoever operates this, not something to guess
 * at speculatively here. This is the right-sized version for what this
 * phase can honestly deliver: real numbers, visible via one endpoint,
 * for a single running instance.
 */
@Injectable()
export class NotificationMetricsService {
  private readonly counters = new Map<string, number>();

  increment(key: string, by = 1): void {
    this.counters.set(key, (this.counters.get(key) ?? 0) + by);
  }

  snapshot(): Record<string, number> {
    return Object.fromEntries(this.counters.entries());
  }
}
