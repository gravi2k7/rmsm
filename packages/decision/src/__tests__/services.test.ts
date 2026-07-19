import { describe, expect, it } from "vitest";
import { RiskService, type RiskLimits } from "../services/risk.service";
import { DecisionService } from "../services/decision.service";
import { Decision } from "../entities/decision";
import { RiskAssessment, type RiskChecks } from "../entities/risk-assessment";
import { PositionSize } from "../entities/position-size";
import { RiskScore } from "../value-objects/risk-score";
import { SymbolCode } from "@rmsm/market";
import type { RiskEngine, AccountSnapshot } from "../interfaces/risk-engine.interface";
import type { DecisionRepository } from "../repositories/decision.repository";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function healthyAccount(): AccountSnapshot {
  return { equity: 10000, usedMargin: 500, availableMargin: 9500, dailyPnL: 0, openPositionCount: 1 };
}

function fakeRiskEngine(account: AccountSnapshot, correlation = 0): RiskEngine {
  return {
    getAccountSnapshot: async () => account,
    getCorrelationWithOpenPositions: async () => correlation,
  };
}

const defaultLimits: RiskLimits = {
  maxDailyLossFraction: 0.05,
  maxPositionSizeFraction: 0.02,
  maxExposureFraction: 0.1,
  maxCorrelation: 0.7,
  minMarginBufferFraction: 0.2,
};

describe("RiskService.assess", () => {
  it("passes every check under healthy account conditions", async () => {
    const service = new RiskService(fakeRiskEngine(healthyAccount()));
    const assessment = await service.assess(symbol(), 0.01, defaultLimits);
    expect(assessment.passed()).toBe(true);
  });

  it("fails maxDailyLoss when daily PnL loss exceeds the limit", async () => {
    const account = { ...healthyAccount(), dailyPnL: -600 }; // 6% loss vs 5% limit
    const service = new RiskService(fakeRiskEngine(account));
    const assessment = await service.assess(symbol(), 0.01, defaultLimits);
    expect(assessment.checks.maxDailyLoss.passed).toBe(false);
  });

  it("fails maxPositionSize when proposed risk exceeds the limit", async () => {
    const service = new RiskService(fakeRiskEngine(healthyAccount()));
    const assessment = await service.assess(symbol(), 0.05, defaultLimits); // 5% vs 2% limit
    expect(assessment.checks.maxPositionSize.passed).toBe(false);
  });

  it("fails correlationCheck when correlation exceeds the limit", async () => {
    const service = new RiskService(fakeRiskEngine(healthyAccount(), 0.9));
    const assessment = await service.assess(symbol(), 0.01, defaultLimits);
    expect(assessment.checks.correlationCheck.passed).toBe(false);
  });

  it("fails marginCheck when margin buffer is too thin", async () => {
    const account = { ...healthyAccount(), availableMargin: 500 }; // 5% vs 20% required
    const service = new RiskService(fakeRiskEngine(account));
    const assessment = await service.assess(symbol(), 0.01, defaultLimits);
    expect(assessment.checks.marginCheck.passed).toBe(false);
  });
});

describe("RiskService.calculatePositionSize", () => {
  it("computes units from riskAmount / stopDistance", async () => {
    const service = new RiskService(fakeRiskEngine(healthyAccount()));
    const result = await service.calculatePositionSize(symbol(), 0.02, 0.005); // 2% of 10000 = 200 risk / 0.005 stop
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.units).toBeCloseTo(40000);
  });

  it("fails when the resulting units would be non-positive (zero stop distance)", async () => {
    const service = new RiskService(fakeRiskEngine(healthyAccount()));
    const result = await service.calculatePositionSize(symbol(), 0.02, 0);
    expect(result.ok).toBe(false);
  });
});

function passingChecks(): RiskChecks {
  const pass = { passed: true };
  return { maxDailyLoss: pass, maxPositionSize: pass, exposureLimits: pass, correlationCheck: pass, marginCheck: pass };
}

function riskScore(value: number) {
  const r = RiskScore.create(value);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildDecision(checks: RiskChecks) {
  const assessment = RiskAssessment.create("ra1", { checks, overallScore: riskScore(10), assessedAt: new Date() });
  const positionSize = PositionSize.create("ps1", { symbolCode: symbol(), units: 1000, calculationBasis: "x", accountEquity: 10000, riskAmount: 200 });
  return Decision.create("dec1", { opportunityId: "opp-1", riskAssessment: assessment, positionSize, createdAt: new Date() });
}

function fakeDecisionRepo(decision: Decision | null): DecisionRepository {
  const store = new Map<string, Decision>();
  if (decision) store.set(decision.id, decision);
  return {
    findById: async (id) => store.get(id) ?? null,
    findByStatus: async () => [],
    findByOpportunityId: async () => null,
    save: async (d) => {
      store.set(d.id, d);
    },
  };
}

describe("DecisionService.approve", () => {
  it("approves a decision whose risk assessment passed", async () => {
    const decision = buildDecision(passingChecks());
    const service = new DecisionService(fakeDecisionRepo(decision));
    const result = await service.approve("dec1", "user-1");
    expect(result.ok && result.value.status).toBe("APPROVED");
  });

  it("refuses to approve a decision whose risk assessment failed, without persisting it", async () => {
    const failing: RiskChecks = { ...passingChecks(), marginCheck: { passed: false } };
    const decision = buildDecision(failing);
    const service = new DecisionService(fakeDecisionRepo(decision));
    const result = await service.approve("dec1", "user-1");
    expect(result.ok).toBe(false);
    expect(decision.status).toBe("PENDING"); // unchanged
  });

  it("returns UnknownDecisionError when the decision doesn't exist", async () => {
    const service = new DecisionService(fakeDecisionRepo(null));
    const result = await service.approve("missing", "user-1");
    expect(result.ok).toBe(false);
  });
});

describe("DecisionService.reject / flagForManualReview", () => {
  it("reject() does not require risk assessment to have passed", async () => {
    const failing: RiskChecks = { ...passingChecks(), marginCheck: { passed: false } };
    const decision = buildDecision(failing);
    const service = new DecisionService(fakeDecisionRepo(decision));
    const result = await service.reject("dec1", "user-1", "too risky");
    expect(result.ok && result.value.status).toBe("REJECTED");
  });

  it("flagForManualReview() transitions successfully", async () => {
    const decision = buildDecision(passingChecks());
    const service = new DecisionService(fakeDecisionRepo(decision));
    const result = await service.flagForManualReview("dec1", "double check");
    expect(result.ok && result.value.status).toBe("MANUAL_REVIEW");
  });
});
