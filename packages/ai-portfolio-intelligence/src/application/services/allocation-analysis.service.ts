import type { Portfolio, Exposure } from "@rmsm/portfolio";
import type { AllocationBreakdown } from "../../domain/entities/allocation-breakdown.entity";

export interface SymbolExposure {
  readonly symbolCode: string;
  readonly exposure: Exposure;
}

/** Reads each symbol's REAL `Exposure.percentage` (from
 * `RiskMonitorService.computeSymbolExposure`) into one weight
 * breakdown — no independent weight calculation. */
export class AllocationAnalysisService {
  analyze(portfolio: Portfolio, symbolExposures: readonly SymbolExposure[]): AllocationBreakdown {
    const allocations = symbolExposures.map((entry) => ({ symbolCode: entry.symbolCode, weightPercentage: entry.exposure.percentage }));
    return { portfolioId: portfolio.id, allocations };
  }
}
