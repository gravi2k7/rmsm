import { describe, expect, it } from "vitest";
import { RiskAnalysisService } from "../services/risk-analysis.service";
import { RiskVerdict } from "../../domain/enums/risk-intelligence.enum";
import { buildRiskAssessment } from "./fakes";

describe("RiskAnalysisService", () => {
  const service = new RiskAnalysisService();

  it("rates a low-score, all-checks-passed REAL RiskAssessment as ACCEPTABLE", () => {
    const assessment = buildRiskAssessment(20);
    const result = service.analyze("decision-1", assessment);
    expect(result.verdict).toBe(RiskVerdict.ACCEPTABLE);
  });

  it("rates a REAL RiskAssessment with a failing check as CRITICAL regardless of score", () => {
    const assessment = buildRiskAssessment(10, ["marginCheck"]);
    const result = service.analyze("decision-1", assessment);
    expect(result.verdict).toBe(RiskVerdict.CRITICAL);
    expect(result.reasons.some((r) => r.includes("marginCheck"))).toBe(true);
  });
});
