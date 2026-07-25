import type { LatencyMetric } from "../../domain/entities/latency-metric.entity";
import type { RetryMetric } from "../../domain/entities/retry-metric.entity";
import type { FailureMetric } from "../../domain/entities/failure-metric.entity";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";

/** Records the operational metrics of a request — latency, retries,
 * failures. Deliberately separate from `TracingService` (which owns
 * the request's *narrative*): this service owns its *numbers*. */
export class MetricsService {
  constructor(private readonly metricsRepository: MetricsRepository) {}

  async recordLatency(requestId: string, startedAt: Date, completedAt: Date): Promise<LatencyMetric> {
    const metric: LatencyMetric = {
      requestId,
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
    };
    await this.metricsRepository.recordLatency(metric);
    return metric;
  }

  async recordRetry(metric: RetryMetric): Promise<void> {
    await this.metricsRepository.recordRetry(metric);
  }

  async recordFailure(metric: FailureMetric): Promise<void> {
    await this.metricsRepository.recordFailure(metric);
  }

  async getLatencies(requestId: string): Promise<readonly LatencyMetric[]> {
    return this.metricsRepository.findLatenciesByRequestId(requestId);
  }
}
