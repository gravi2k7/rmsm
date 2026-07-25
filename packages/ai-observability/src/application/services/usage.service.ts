import type { IdGenerator } from "@rmsm/core";
import type { TokenUsage } from "../../domain/entities/token-usage.entity";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";
import type { TelemetryPublisher } from "../../events/telemetry-publisher.interface";
import type { UsageRecordedEvent } from "../../events/observability-domain-events.interface";

/** Records raw `TokenUsage` for a request and publishes
 * `UsageRecorded` — the fact `CostService` prices, kept as its own
 * service since token accounting is meaningful without a price
 * attached (e.g. a self-hosted model with no per-token cost). */
export class UsageService {
  constructor(
    private readonly metricsRepository: MetricsRepository,
    private readonly telemetryPublisher: TelemetryPublisher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async recordUsage(requestId: string, usage: TokenUsage, occurredAt: Date): Promise<void> {
    await this.metricsRepository.recordUsage(requestId, usage);

    const event: UsageRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "UsageRecorded",
      occurredAt,
      aggregateId: requestId,
      requestId,
      tokenUsage: usage,
    };
    await this.telemetryPublisher.publish([event]);
  }
}
