import { describe, expect, it } from "vitest";
import { StrategyEvaluationService } from "../services/strategy-evaluation.service";
import { StrategyRiskScoringService } from "../services/strategy-risk-scoring.service";
import { StrategyConfidenceScoringService } from "../services/strategy-confidence-scoring.service";
import { StrategyExplanationService } from "../services/strategy-explanation.service";
import { buildStrategy, FixedClock } from "./fakes";

describe("StrategyExplanationService", () => {
  const evaluationService = new StrategyEvaluationService();
  const riskScoringService = new StrategyRiskScoringService();
  const confidenceScoringService = new StrategyConfidenceScoringService();
  const service = new StrategyExplanationService(new FixedClock());

  it("composes a narrative mentioning the strategy name, verdict, and risk band", () => {
    const strategy = buildStrategy({ name: "Momentum Rider", status: "PRODUCTION" });
    const evaluation = evaluationService.evaluate(strategy);
    const risk = riskScoringService.score(strategy);
    const confidence = confidenceScoringService.score(strategy, evaluation);

    const explanation = service.explain(strategy, evaluation, risk, confidence);
    expect(explanation.narrative).toContain("Momentum Rider");
    expect(explanation.narrative).toContain(evaluation.verdict);
    expect(explanation.narrative).toContain(risk.band);
  });
});
