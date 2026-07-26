import type { Strategy } from "@rmsm/strategy";
import type { StrategyRiskScore } from "../../domain/entities/strategy-risk-score.entity";
import { RiskScoreBand } from "../../domain/enums/strategy-intelligence.enum";

const TOLERANCE_BASE: Readonly<Record<string, number>> = { LOW: 20, MEDIUM: 45, HIGH: 70 };

/** Turns a `Strategy`'s own declared `RiskProfile` into a single 0..100
 * score + band — reads the profile's numbers, never re-derives risk
 * policy itself (that stays `@rmsm/decision`'s job at execution time). */
export class StrategyRiskScoringService {
  score(strategy: Strategy): StrategyRiskScore {
    const profile = strategy.riskProfile;
    const base = TOLERANCE_BASE[profile.tolerance] ?? 45;
    const leverageComponent = Math.min(20, profile.maxLeverage * 2);
    const riskPerTradeComponent = Math.min(10, profile.maxRiskPerTrade * 100);
    const raw = base + leverageComponent + riskPerTradeComponent;
    const riskScore = Math.max(0, Math.min(100, Math.round(raw)));

    const band = riskScore < 30 ? RiskScoreBand.LOW : riskScore < 55 ? RiskScoreBand.MODERATE : riskScore < 80 ? RiskScoreBand.HIGH : RiskScoreBand.EXTREME;

    return { strategyId: strategy.id.value, riskScore, band };
  }
}
