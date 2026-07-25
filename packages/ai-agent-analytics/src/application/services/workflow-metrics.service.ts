import type { IdGenerator, Clock } from "@rmsm/core";
import type { AnalyticsRepository } from "../../repositories/analytics-repository.interface";
import type { WorkflowRunOutcome } from "../../domain/enums/analytics.enum";
import type { WorkflowRunMetric } from "../../domain/entities/workflow-run-metric.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { WorkflowMetricRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

export class WorkflowMetricsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async recordRunTerminal(outcome: WorkflowRunOutcome): Promise<void> {
    await this.repository.recordWorkflowRunTerminal(outcome);

    const event: WorkflowMetricRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkflowMetricRecorded",
      occurredAt: this.clock.now(),
      aggregateId: "workflow",
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }

  async getMetrics(): Promise<WorkflowRunMetric> {
    return this.repository.getWorkflowMetrics();
  }
}
