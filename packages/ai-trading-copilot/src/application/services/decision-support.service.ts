import type { StrategyRecommendation } from "@rmsm/ai-strategy-intelligence";
import type { RiskRecommendation } from "@rmsm/ai-risk-intelligence";
import type { DecisionSupportResult } from "../../domain/entities/decision-support-result.entity";
import { DecisionSupportVerdict } from "../../domain/enums/trading-copilot.enum";

const UNFAVORABLE_RISK_ACTIONS = new Set(["CLOSE_POSITION", "HEDGE"]);
const UNFAVORABLE_STRATEGY_ACTIONS = new Set(["ARCHIVE"]);

/**
 * Composes a REAL, unmodified `@rmsm/ai-strategy-intelligence` (AI-602)
 * `StrategyRecommendation` and a REAL `@rmsm/ai-risk-intelligence`
 * (AI-605) `RiskRecommendation` into ONE decision-support verdict —
 * never a third, independent risk or strategy calculation.
 */
export class DecisionSupportService {
  support(symbolCode: string, strategyId: string, strategyRecommendation: StrategyRecommendation, riskRecommendation: RiskRecommendation): DecisionSupportResult {
    if (UNFAVORABLE_RISK_ACTIONS.has(riskRecommendation.action) || UNFAVORABLE_STRATEGY_ACTIONS.has(strategyRecommendation.action)) {
      return {
        symbolCode,
        strategyId,
        verdict: DecisionSupportVerdict.UNFAVORABLE,
        rationale: `Risk: ${riskRecommendation.rationale} Strategy: ${strategyRecommendation.rationale}`,
      };
    }
    if (riskRecommendation.action === "REDUCE_EXPOSURE" || strategyRecommendation.action === "HOLD") {
      return {
        symbolCode,
        strategyId,
        verdict: DecisionSupportVerdict.CAUTION,
        rationale: `Risk: ${riskRecommendation.rationale} Strategy: ${strategyRecommendation.rationale}`,
      };
    }
    return {
      symbolCode,
      strategyId,
      verdict: DecisionSupportVerdict.FAVORABLE,
      rationale: `Risk: ${riskRecommendation.rationale} Strategy: ${strategyRecommendation.rationale}`,
    };
  }
}
