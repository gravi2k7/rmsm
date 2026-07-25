import type { IdGenerator } from "@rmsm/core";
import type { TokenUsage } from "../../domain/entities/token-usage.entity";
import type { CostUsage } from "../../domain/entities/cost-usage.entity";
import type { ModelPricing } from "../../domain/entities/pricing-table.entity";
import { UnknownProviderPricingError } from "../../domain/errors/observability-domain.errors";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";
import type { TelemetryPublisher } from "../../events/telemetry-publisher.interface";
import type { CostRecordedEvent } from "../../events/observability-domain-events.interface";

/** Prices a `TokenUsage` against an injected pricing table, records the
 * resulting `CostUsage`, and publishes `CostRecorded`. Kept distinct
 * from `UsageService` because pricing is a business rule (a table that
 * changes on its own schedule) layered on top of a fact (token counts)
 * that never changes once a provider call completes. */
export class CostService {
  constructor(
    private readonly pricingTable: readonly ModelPricing[],
    private readonly metricsRepository: MetricsRepository,
    private readonly telemetryPublisher: TelemetryPublisher,
    private readonly idGenerator: IdGenerator,
  ) {}

  async recordCost(requestId: string, providerName: string, model: string, usage: TokenUsage, occurredAt: Date): Promise<CostUsage> {
    const pricing = this.pricingTable.find((entry) => entry.providerName === providerName && entry.model === model);
    if (!pricing) {
      throw new UnknownProviderPricingError(providerName, model);
    }

    const promptCostUsd = (usage.promptTokens / 1000) * pricing.promptCostPer1kUsd;
    const completionCostUsd = (usage.completionTokens / 1000) * pricing.completionCostPer1kUsd;
    const cost: CostUsage = {
      promptCostUsd,
      completionCostUsd,
      totalCostUsd: promptCostUsd + completionCostUsd,
      currency: "USD",
    };

    await this.metricsRepository.recordCost(requestId, cost);

    const event: CostRecordedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "CostRecorded",
      occurredAt,
      aggregateId: requestId,
      requestId,
      costUsage: cost,
    };
    await this.telemetryPublisher.publish([event]);
    return cost;
  }
}
