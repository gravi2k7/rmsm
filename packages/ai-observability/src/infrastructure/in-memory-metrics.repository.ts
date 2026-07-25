import type { MetricsRepository } from "../metrics/metrics-repository.interface";
import type { LatencyMetric } from "../domain/entities/latency-metric.entity";
import type { RetryMetric } from "../domain/entities/retry-metric.entity";
import type { FailureMetric } from "../domain/entities/failure-metric.entity";
import type { TokenUsage } from "../domain/entities/token-usage.entity";
import type { CostUsage } from "../domain/entities/cost-usage.entity";

export class InMemoryMetricsRepository implements MetricsRepository {
  private readonly latencies: LatencyMetric[] = [];
  private readonly retries: RetryMetric[] = [];
  private readonly failures: FailureMetric[] = [];
  private readonly usageByRequestId = new Map<string, TokenUsage>();
  private readonly costByRequestId = new Map<string, CostUsage>();

  async recordLatency(metric: LatencyMetric): Promise<void> {
    this.latencies.push(metric);
  }

  async recordRetry(metric: RetryMetric): Promise<void> {
    this.retries.push(metric);
  }

  async recordFailure(metric: FailureMetric): Promise<void> {
    this.failures.push(metric);
  }

  async recordUsage(requestId: string, usage: TokenUsage): Promise<void> {
    this.usageByRequestId.set(requestId, usage);
  }

  async recordCost(requestId: string, cost: CostUsage): Promise<void> {
    this.costByRequestId.set(requestId, cost);
  }

  async findLatenciesByRequestId(requestId: string): Promise<readonly LatencyMetric[]> {
    return this.latencies.filter((metric) => metric.requestId === requestId);
  }
}
