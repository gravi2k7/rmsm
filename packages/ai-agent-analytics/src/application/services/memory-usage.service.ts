import type { IdGenerator, Clock } from "@rmsm/core";
import type { AnalyticsRepository } from "../../repositories/analytics-repository.interface";
import type { MemoryUsageMetric } from "../../domain/entities/memory-usage-metric.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { MemoryUsageRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

export class MemoryUsageService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async recordWrite(agentId: string): Promise<void> {
    await this.repository.recordMemoryWrite(agentId);

    const event: MemoryUsageRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "MemoryUsageRecorded",
      occurredAt: this.clock.now(),
      aggregateId: agentId,
      agentId,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }

  async getUsage(agentId: string): Promise<MemoryUsageMetric> {
    return this.repository.getMemoryUsage(agentId);
  }
}
