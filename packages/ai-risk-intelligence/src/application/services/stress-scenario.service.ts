import type { StressScenarioResult } from "../../domain/entities/stress-scenario-result.entity";
import { EmptyStressScenarioSetError } from "../../domain/errors/risk-intelligence-domain.errors";

export interface StressScenarioInput {
  readonly scenarioName: string;
  readonly shockPercentage: number;
}

/**
 * Hypothetical "what if the market moved against open positions by X%"
 * projections — a simple, transparent linear shock model applied to
 * REAL `currentEquity`/`peakEquity`/`openPositionsMarketValue` inputs,
 * never a live simulation or backtest (that belongs to AI-607).
 */
export class StressScenarioService {
  simulate(
    portfolioId: string,
    currentEquity: number,
    peakEquity: number,
    openPositionsMarketValue: number,
    drawdownLimitPercentage: number,
    scenarios: readonly StressScenarioInput[],
  ): readonly StressScenarioResult[] {
    if (scenarios.length === 0) throw new EmptyStressScenarioSetError();

    return scenarios.map((scenario) => {
      const shockLoss = openPositionsMarketValue * (scenario.shockPercentage / 100);
      const projectedEquity = currentEquity - shockLoss;
      const projectedDrawdownPercentage = peakEquity <= 0 ? 0 : Math.max(0, ((peakEquity - projectedEquity) / peakEquity) * 100);

      return {
        portfolioId,
        scenarioName: scenario.scenarioName,
        shockPercentage: scenario.shockPercentage,
        projectedEquity,
        projectedDrawdownPercentage,
        breachesLimit: projectedDrawdownPercentage > drawdownLimitPercentage,
      };
    });
  }
}
