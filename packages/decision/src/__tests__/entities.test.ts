import { describe, expect, it } from "vitest";
import { PositionSize } from "../entities/position-size";
import { RiskAssessment, type RiskChecks } from "../entities/risk-assessment";
import { Approval } from "../entities/approval";
import { Decision } from "../entities/decision";
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

function failingChecks(): RiskChecks {
  return { ...passingChecks(), marginCheck: { passed: false, message: "insufficient margin" } };
}

function riskScore(value: number) {
  const r = RiskScore.create(value);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("PositionSize", () => {
  it("computes riskFraction from riskAmount / accountEquity", () => {
    const ps = PositionSize.create("ps1", { symbolCode: symbol(), units: 1000, calculationBasis: "x", accountEquity: 10000, riskAmount: 200 });
    expect(ps.riskFraction).toBeCloseTo(0.02);
  });
  it("rejects non-positive units", () => {
    expect(() => PositionSize.create("ps1", { symbolCode: symbol(), units: 0, calculationBasis: "x", accountEquity: 10000, riskAmount: 200 })).toThrow();
  });
  it("rejects non-positive accountEquity", () => {
    expect(() => PositionSize.create("ps1", { symbolCode: symbol(), units: 100, calculationBasis: "x", accountEquity: 0, riskAmount: 200 })).toThrow();
  });
});

describe("RiskAssessment", () => {
  it("passed() is true when every check passes", () => {
    const assessment = RiskAssessment.create("ra1", { checks: passingChecks(), overallScore: riskScore(10), assessedAt: new Date() });
    expect(assessment.passed()).toBe(true);
    expect(assessment.failedCheckNames()).toHaveLength(0);
  });

  it("passed() is false when any check fails, and names it", () => {
    const assessment = RiskAssessment.create("ra1", { checks: failingChecks(), overallScore: riskScore(10), assessedAt: new Date() });
    expect(assessment.passed()).toBe(false);
    expect(assessment.failedCheckNames()).toEqual(["marginCheck"]);
  });
});

describe("Approval", () => {
  it("starts PENDING", () => {
    expect(Approval.createPending("a1").status.value).toBe("PENDING");
  });
  it("approve() records decidedBy/decidedAt/comments", () => {
    const approval = Approval.createPending("a1");
    approval.approve("user-1", "looks good");
    expect(approval.status.value).toBe("APPROVED");
    expect(approval.decidedBy).toBe("user-1");
    expect(approval.comments).toBe("looks good");
  });
  it("reject() rejects with a decidedBy required", () => {
    const approval = Approval.createPending("a1");
    expect(() => approval.reject("")).toThrow();
  });
  it("flagForManualReview() sets MANUAL_REVIEW without requiring a decider", () => {
    const approval = Approval.createPending("a1");
    approval.flagForManualReview("needs a second look");
    expect(approval.status.value).toBe("MANUAL_REVIEW");
  });
});

function buildDecision(checks: RiskChecks = passingChecks()) {
  const assessment = RiskAssessment.create("ra1", { checks, overallScore: riskScore(10), assessedAt: new Date() });
  const positionSize = PositionSize.create("ps1", { symbolCode: symbol(), units: 1000, calculationBasis: "x", accountEquity: 10000, riskAmount: 200 });
  return Decision.create("dec1", { opportunityId: "opp-1", riskAssessment: assessment, positionSize, createdAt: new Date() });
}

describe("Decision", () => {
  it("starts PENDING with a pending Approval", () => {
    const decision = buildDecision();
    expect(decision.status).toBe("PENDING");
    expect(decision.approval.status.value).toBe("PENDING");
  });

  it("approve() transitions to APPROVED and raises DecisionApprovedEvent", () => {
    const decision = buildDecision();
    decision.approve("user-1", "ok");
    expect(decision.status).toBe("APPROVED");
    expect(decision.approval.status.value).toBe("APPROVED");
    expect(decision.pullDomainEvents()[0]?.kind).toBe("DecisionApproved");
  });

  it("reject() transitions to REJECTED and raises DecisionRejectedEvent", () => {
    const decision = buildDecision();
    decision.reject("user-1", "too risky");
    expect(decision.status).toBe("REJECTED");
    expect(decision.pullDomainEvents()[0]?.kind).toBe("DecisionRejected");
  });

  it("flagForManualReview() transitions to MANUAL_REVIEW", () => {
    const decision = buildDecision();
    decision.flagForManualReview("borderline");
    expect(decision.status).toBe("MANUAL_REVIEW");
  });

  it("MANUAL_REVIEW can still be approved or rejected afterward", () => {
    const decision = buildDecision();
    decision.flagForManualReview();
    decision.approve("user-1");
    expect(decision.status).toBe("APPROVED");
  });

  it("rejects any transition once APPROVED (terminal)", () => {
    const decision = buildDecision();
    decision.approve("user-1");
    expect(() => decision.reject("user-1")).toThrow();
  });
});
