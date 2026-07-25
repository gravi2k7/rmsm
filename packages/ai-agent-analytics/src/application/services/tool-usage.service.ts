import type { IdGenerator, Clock } from "@rmsm/core";
import type { AnalyticsRepository } from "../../repositories/analytics-repository.interface";
import { ToolOutcome } from "../../domain/enums/analytics.enum";
import type { ToolUsageMetric } from "../../domain/entities/tool-usage-metric.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ToolUsageRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

export class ToolUsageService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async recordInvocation(toolName: string): Promise<void> {
    await this.repository.recordToolInvocation(toolName);
    await this.publish(toolName);
  }

  async recordOutcome(toolName: string, outcome: ToolOutcome): Promise<void> {
    await this.repository.recordToolOutcome(toolName, outcome);
    await this.publish(toolName);
  }

  async getUsage(toolName: string): Promise<ToolUsageMetric> {
    return this.repository.getToolUsage(toolName);
  }

  private async publish(toolName: string): Promise<void> {
    const event: ToolUsageRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "ToolUsageRecorded",
      occurredAt: this.clock.now(),
      aggregateId: toolName,
      toolName,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }
}
