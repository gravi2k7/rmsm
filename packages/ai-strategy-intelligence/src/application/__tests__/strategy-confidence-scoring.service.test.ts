import { describe, expect, it } from "vitest";
import { StrategyEvaluationService } from "../services/strategy-evaluation.service";
import { StrategyConfidenceScoringService } from "../services/strategy-confidence-scoring.service";
import { buildStrategy } from "./fakes";

describe("StrategyConfidenceScoringService", () => {
  const evaluationService = new StrategyEvaluationService();
  const service = new StrategyConfidenceScoringService();

  it("gives higher confidence to a PRODUCTION strategy than a DRAFT one with the same structure", () => {
    const draft = buildStrategy({ status: "DRAFT" });
    const production = buildStrategy({ status: "PRODUCTION" });

    const draftConfidence = service.score(draft, evaluationService.evaluate(draft));
    const productionConfidence = service.score(production, evaluationService.evaluate(production));

    expect(productionConfidence.confidence).toBeGreaterThan(draftConfidence.confidence);
  });

  it("keeps confidence within [0, 1]", () => {
    const strategy = buildStrategy({ status: "PRODUCTION" });
    const result = service.score(strategy, evaluationService.evaluate(strategy));
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});
