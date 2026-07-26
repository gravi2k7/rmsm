import type { Exposure } from "@rmsm/portfolio";
import type { ExposureMonitoringResult } from "../../domain/entities/exposure-monitoring-result.entity";

export interface MonitoredExposureInput {
  readonly exposure: Exposure;
  readonly limitPercentage: number;
}

/** Batches REAL `@rmsm/portfolio` `Exposure.exceeds()` checks (each
 * `Exposure` itself produced by `RiskMonitorService`) — pure
 * aggregation, no new exposure math. */
export class ExposureMonitoringService {
  monitor(portfolioId: string, inputs: readonly MonitoredExposureInput[]): ExposureMonitoringResult {
    const exposures = inputs.map((input) => ({
      scope: input.exposure.scope,
      scopeId: input.exposure.scopeId,
      percentage: input.exposure.percentage,
      limitPercentage: input.limitPercentage,
      withinLimit: !input.exposure.exceeds(input.limitPercentage),
    }));

    return { portfolioId, exposures, anyBreached: exposures.some((e) => !e.withinLimit) };
  }
}
