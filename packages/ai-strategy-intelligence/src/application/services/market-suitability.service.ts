import type { Strategy } from "@rmsm/strategy";
import type { SymbolCode } from "@rmsm/market";
import type { RegimeAnalysis, VolatilityAnalysis } from "@rmsm/ai-market-intelligence";
import { MarketRegime, VolatilityLevel } from "@rmsm/ai-market-intelligence";
import type { MarketSuitability } from "../../domain/entities/market-suitability.entity";
import { SuitabilityLevel } from "../../domain/enums/strategy-intelligence.enum";

const VOLATILITY_RANK: Readonly<Record<VolatilityLevel, number>> = {
  [VolatilityLevel.LOW]: 0,
  [VolatilityLevel.MODERATE]: 1,
  [VolatilityLevel.HIGH]: 2,
  [VolatilityLevel.EXTREME]: 3,
};

const TOLERANCE_CEILING: Readonly<Record<string, number>> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Cross-package AI-6xx reuse: checks a `Strategy`'s own declared
 * `RiskProfile.tolerance` against a REAL `@rmsm/ai-market-intelligence`
 * (AI-601) `VolatilityAnalysis`/`RegimeAnalysis` — never recomputes
 * volatility or regime itself.
 */
export class MarketSuitabilityService {
  assess(strategy: Strategy, symbolCode: SymbolCode, volatility: VolatilityAnalysis, regime: RegimeAnalysis): MarketSuitability {
    const strategyId = strategy.id.value;
    const ceiling = TOLERANCE_CEILING[strategy.riskProfile.tolerance] ?? 2;
    const volatilityRank = VOLATILITY_RANK[volatility.level];

    if (volatilityRank > ceiling) {
      return {
        strategyId,
        symbolCode: symbolCode.value,
        level: SuitabilityLevel.UNSUITABLE,
        reason: `${volatility.level} volatility exceeds this strategy's ${strategy.riskProfile.tolerance} risk tolerance.`,
      };
    }

    if (volatilityRank === ceiling && regime.regime === MarketRegime.VOLATILE) {
      return {
        strategyId,
        symbolCode: symbolCode.value,
        level: SuitabilityLevel.MARGINAL,
        reason: `Volatility is at this strategy's tolerance ceiling while the market regime is VOLATILE.`,
      };
    }

    if (!strategy.supportsSymbol(symbolCode)) {
      return {
        strategyId,
        symbolCode: symbolCode.value,
        level: SuitabilityLevel.MARGINAL,
        reason: `${symbolCode.value} is not among this strategy's declared supported symbols.`,
      };
    }

    return {
      strategyId,
      symbolCode: symbolCode.value,
      level: SuitabilityLevel.SUITABLE,
      reason: `${volatility.level} volatility is within this strategy's ${strategy.riskProfile.tolerance} risk tolerance.`,
    };
  }
}
