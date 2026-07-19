import { describe, expect, it } from "vitest";
import { DecisionFactory } from "../factories/decision.factory";
import { RiskAssessment, type RiskChecks } from "../entities/risk-assessment";
import { PositionSize } from "../entities/position-size";
import { RiskScore } from "../value-objects/risk-score";
import { SymbolCode } from "@rmsm/market";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function passingChecks(): RiskChecks {
  const pass = { passed: true };
  return { maxDailyLoss: pass, maxPositionSize: pass, exposureLimits: pass, correlationCheck: pass, marginCheck: pass };
}

function buildAssessmentAndSize() {
  const score = RiskScore.create(10);
  if (!score.ok) throw new Error("fixture failed");
  const riskAssessment = RiskAssessment.create("ra1", { checks: passingChecks(), overallScore: score.value, assessedAt: new Date() });
  const positionSize = PositionSize.create("ps1", { symbolCode: symbol(), units: 1000, calculationBasis: "x", accountEquity: 10000, riskAmount: 200 });
  return { riskAssessment, positionSize };
}

describe("DecisionFactory.create", () => {
  it("builds a valid Decision from an assessment and position size", () => {
    const { riskAssessment, positionSize } = buildAssessmentAndSize();
    const result = DecisionFactory.create({ opportunityId: "opp-1", riskAssessment, positionSize });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.opportunityId).toBe("opp-1");
      expect(result.value.status).toBe("PENDING");
    }
  });

  it("generates a random id when none is supplied", () => {
    const { riskAssessment, positionSize } = buildAssessmentAndSize();
    const a = DecisionFactory.create({ opportunityId: "opp-1", riskAssessment, positionSize });
    const b = DecisionFactory.create({ opportunityId: "opp-1", riskAssessment, positionSize });
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) {
      expect(a.value.id).not.toBe(b.value.id);
    }
  });

  it("uses the supplied id when given", () => {
    const { riskAssessment, positionSize } = buildAssessmentAndSize();
    const result = DecisionFactory.create({ id: "custom-id", opportunityId: "opp-1", riskAssessment, positionSize });
    expect(result.ok && result.value.id).toBe("custom-id");
  });
});
