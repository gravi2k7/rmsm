import { describe, it, expect, beforeEach } from "vitest";
import { CostService } from "../services/cost.service";
import { UnknownProviderPricingError } from "../../domain/errors/observability-domain.errors";
import { SequentialIdGenerator, RecordingTelemetryPublisher, makeMetricsRepository } from "./fakes";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";
import type { ModelPricing } from "../../domain/entities/pricing-table.entity";

describe("CostService", () => {
  let metricsRepository: MetricsRepository;
  let telemetryPublisher: RecordingTelemetryPublisher;
  const pricingTable: readonly ModelPricing[] = [
    { providerName: "openai", model: "gpt-5", promptCostPer1kUsd: 0.01, completionCostPer1kUsd: 0.03 },
  ];
  let service: CostService;

  beforeEach(() => {
    metricsRepository = makeMetricsRepository();
    telemetryPublisher = new RecordingTelemetryPublisher();
    service = new CostService(pricingTable, metricsRepository, telemetryPublisher, new SequentialIdGenerator());
  });

  it("computes cost from token usage using the pricing table", async () => {
    const cost = await service.recordCost("req-1", "openai", "gpt-5", { promptTokens: 1000, completionTokens: 1000, totalTokens: 2000 }, new Date());

    expect(cost.promptCostUsd).toBeCloseTo(0.01);
    expect(cost.completionCostUsd).toBeCloseTo(0.03);
    expect(cost.totalCostUsd).toBeCloseTo(0.04);
    expect(telemetryPublisher.published[0]?.kind).toBe("CostRecorded");
  });

  it("throws UnknownProviderPricingError for an unpriced provider/model pair", async () => {
    await expect(
      service.recordCost("req-1", "anthropic", "claude-unknown", { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, new Date()),
    ).rejects.toThrow(UnknownProviderPricingError);
  });
});
