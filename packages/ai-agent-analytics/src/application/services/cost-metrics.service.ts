import type { IdGenerator, Clock } from "@rmsm/core";
import type { AnalyticsRepository } from "../../repositories/analytics-repository.interface";
import type { CostSummary } from "../../domain/entities/cost-summary.entity";
import { NegativeCostAmountError } from "../../domain/errors/agent-analytics-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { CostRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

export class CostMetricsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async recordCost(agentId: string, amount: number, currency: string): Promise<void> {
    if (amount < 0) {
      throw new NegativeCostAmountError();
    }
    await this.repository.recordCost(agentId, amount, currency);

    const event: CostRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "CostRecorded",
      occurredAt: this.clock.now(),
      aggregateId: agentId,
      agentId,
      amount,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }

  async getSummary(agentId: string): Promise<CostSummary> {
    return this.repository.getCostSummary(agentId);
  }
}
