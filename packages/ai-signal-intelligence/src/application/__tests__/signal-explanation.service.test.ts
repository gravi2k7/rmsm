import { describe, expect, it } from "vitest";
import { SignalQualityService } from "../services/signal-quality.service";
import { SignalExplanationService } from "../services/signal-explanation.service";
import { buildOpportunity } from "./fakes";

describe("SignalExplanationService", () => {
  const qualityService = new SignalQualityService();
  const service = new SignalExplanationService();

  it("composes a narrative mentioning direction, symbol, and verdict", () => {
    const opportunity = buildOpportunity({ direction: "SELL", symbolCode: "GBPUSD" });
    const assessment = qualityService.assess(opportunity);
    const explanation = service.explain(opportunity, assessment);

    expect(explanation.narrative).toContain("SELL");
    expect(explanation.narrative).toContain("GBPUSD");
    expect(explanation.narrative).toContain(assessment.verdict);
  });
});
