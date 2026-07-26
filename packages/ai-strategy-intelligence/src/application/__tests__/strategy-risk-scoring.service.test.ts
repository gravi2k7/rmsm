import { describe, expect, it } from "vitest";
import { StrategyRiskScoringService } from "../services/strategy-risk-scoring.service";
import { RiskScoreBand } from "../../domain/enums/strategy-intelligence.enum";
import { buildStrategy } from "./fakes";

describe("StrategyRiskScoringService", () => {
  const service = new StrategyRiskScoringService();

  it("scores a LOW-tolerance, low-leverage strategy in the LOW/MODERATE band", () => {
    const strategy = buildStrategy({ riskTolerance: "LOW", maxLeverage: 1, maxRiskPerTrade: 0.005 });
    const result = service.score(strategy);
    expect(result.band === RiskScoreBand.LOW || result.band === RiskScoreBand.MODERATE).toBe(true);
  });

  it("scores a HIGH-tolerance, high-leverage strategy in the HIGH/EXTREME band", () => {
    const strategy = buildStrategy({ riskTolerance: "HIGH", maxLeverage: 20, maxRiskPerTrade: 0.1 });
    const result = service.score(strategy);
    expect(result.band === RiskScoreBand.HIGH || result.band === RiskScoreBand.EXTREME).toBe(true);
  });

  it("clamps the score to [0, 100]", () => {
    const strategy = buildStrategy({ riskTolerance: "HIGH", maxLeverage: 1000, maxRiskPerTrade: 1 });
    const result = service.score(strategy);
    expect(result.riskScore).toBeLessThanOrEqual(100);
    expect(result.riskScore).toBeGreaterThanOrEqual(0);
  });
});
