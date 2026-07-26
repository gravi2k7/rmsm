import type { Strategy } from "@rmsm/strategy";
import type { StrategyEvaluation } from "../../domain/entities/strategy-evaluation.entity";
import type { StrategyRiskScore } from "../../domain/entities/strategy-risk-score.entity";
import type { StrategyRecommendation } from "../../domain/entities/strategy-recommendation.entity";
import { StrategyRecommendationAction, StrategyVerdict, RiskScoreBand } from "../../domain/enums/strategy-intelligence.enum";

/** Turns an evaluation + risk score into ONE lifecycle recommendation —
 * never mutates `Strategy` itself; a human or a caller decides whether
 * to actually call `Strategy.transitionTo()`. */
export class StrategyRecommendationService {
  recommend(strategy: Strategy, evaluation: StrategyEvaluation, riskScore: StrategyRiskScore): StrategyRecommendation {
    if (evaluation.verdict === StrategyVerdict.NOT_READY) {
      const action = strategy.status === "PRODUCTION" ? StrategyRecommendationAction.ARCHIVE : StrategyRecommendationAction.HOLD;
      return { strategyId: strategy.id.value, action, rationale: `Not ready: ${evaluation.reasons.join(" ")}` };
    }

    if (riskScore.band === RiskScoreBand.EXTREME && strategy.status === "PRODUCTION") {
      return {
        strategyId: strategy.id.value,
        action: StrategyRecommendationAction.DEMOTE,
        rationale: `Risk score ${riskScore.riskScore} is in the EXTREME band while running in PRODUCTION.`,
      };
    }

    if (evaluation.verdict === StrategyVerdict.READY) {
      if (strategy.status === "TESTING") {
        return { strategyId: strategy.id.value, action: StrategyRecommendationAction.PROMOTE, rationale: "Ready to advance from TESTING to PAPER_TRADING." };
      }
      if (strategy.status === "PAPER_TRADING") {
        return { strategyId: strategy.id.value, action: StrategyRecommendationAction.PROMOTE, rationale: "Ready to advance from PAPER_TRADING to PRODUCTION." };
      }
    }

    return { strategyId: strategy.id.value, action: StrategyRecommendationAction.HOLD, rationale: "No lifecycle change warranted at this time." };
  }
}
