import { describe, expect, it } from "vitest";
import { StrategyEvaluationService } from "../services/strategy-evaluation.service";
import { StrategyVerdict } from "../../domain/enums/strategy-intelligence.enum";
import { buildStrategy } from "./fakes";

describe("StrategyEvaluationService", () => {
  const service = new StrategyEvaluationService();

  it("returns READY for a fully-formed, non-draft strategy", () => {
    const strategy = buildStrategy({ status: "TESTING" });
    const result = service.evaluate(strategy);
    expect(result.verdict).toBe(StrategyVerdict.READY);
    expect(result.completenessScore).toBeGreaterThanOrEqual(0.8);
  });

  it("returns NOT_READY for a version-less strategy", () => {
    const strategy = buildStrategy({ entryRuleCount: 0, exitRuleCount: 0 });
    const result = service.evaluate(strategy);
    expect(result.verdict).toBe(StrategyVerdict.NOT_READY);
    expect(result.reasons).toContain("No current version.");
  });

  it("penalizes a strategy with entry rules but no exit rules", () => {
    const strategy = buildStrategy({ status: "TESTING", exitRuleCount: 0 });
    const result = service.evaluate(strategy);
    expect(result.reasons).toContain("No enabled exit rules.");
    expect(result.verdict).not.toBe(StrategyVerdict.READY);
  });
});
