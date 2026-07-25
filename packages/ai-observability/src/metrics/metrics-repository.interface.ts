import type { LatencyMetric } from "../domain/entities/latency-metric.entity";
import type { RetryMetric } from "../domain/entities/retry-metric.entity";
import type { FailureMetric } from "../domain/entities/failure-metric.entity";
import type { TokenUsage } from "../domain/entities/token-usage.entity";
import type { CostUsage } from "../domain/entities/cost-usage.entity";

/** Persistence port for the metric records `MetricsService`,
 * `UsageService`, and `CostService` produce — grouped the same way
 * `TraceRepository` groups trace entities, for the same reason. */
export interface MetricsRepository {
  recordLatency(metric: LatencyMetric): Promise<void>;
  recordRetry(metric: RetryMetric): Promise<void>;
  recordFailure(metric: FailureMetric): Promise<void>;
  recordUsage(requestId: string, usage: TokenUsage): Promise<void>;
  recordCost(requestId: string, cost: CostUsage): Promise<void>;
  findLatenciesByRequestId(requestId: string): Promise<readonly LatencyMetric[]>;
}
