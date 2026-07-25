import type { IdGenerator, Clock } from "@rmsm/core";
import type { AnalyticsRepository } from "../../repositories/analytics-repository.interface";
import type { PlanningMetric } from "../../domain/entities/planning-metric.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { PlanningMetricRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

export class PlanningMetricsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async recordPlanCreated(): Promise<void> {
    await this.repository.recordPlanCreated();
    await this.publish();
  }

  async recordPlanValidated(valid: boolean): Promise<void> {
    await this.repository.recordPlanValidated(valid);
    await this.publish();
  }

  async recordReplanned(): Promise<void> {
    await this.repository.recordReplanned();
    await this.publish();
  }

  async getMetrics(): Promise<PlanningMetric> {
    return this.repository.getPlanningMetrics();
  }

  private async publish(): Promise<void> {
    const event: PlanningMetricRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "PlanningMetricRecorded",
      occurredAt: this.clock.now(),
      aggregateId: "planning",
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }
}
