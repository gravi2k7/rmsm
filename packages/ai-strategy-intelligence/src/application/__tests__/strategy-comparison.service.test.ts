import { describe, expect, it } from "vitest";
import { StrategyEvaluationService } from "../services/strategy-evaluation.service";
import { StrategyRiskScoringService } from "../services/strategy-risk-scoring.service";
import { StrategyComparisonService } from "../services/strategy-comparison.service";
import { InvalidComparisonSetError } from "../../domain/errors/strategy-intelligence-domain.errors";
import { buildStrategy } from "./fakes";

describe("StrategyComparisonService", () => {
  const service = new StrategyComparisonService(new StrategyEvaluationService(), new StrategyRiskScoringService());

  it("picks the more complete strategy as the winner", () => {
    const ready = buildStrategy({ name: "Ready One", status: "PRODUCTION" });
    const notReady = buildStrategy({ name: "Not Ready", entryRuleCount: 0, exitRuleCount: 0 });

    const comparison = service.compare([ready, notReady]);
    expect(comparison.winnerStrategyId).toBe(ready.id.value);
    expect(comparison.entries).toHaveLength(2);
  });

  it("throws InvalidComparisonSetError with fewer than 2 strategies", () => {
    expect(() => service.compare([buildStrategy()])).toThrow(InvalidComparisonSetError);
  });
});
