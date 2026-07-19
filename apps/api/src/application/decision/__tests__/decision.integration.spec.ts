import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { Decision, RiskAssessment, PositionSize, RiskScore, type RiskChecks } from "@rmsm/decision";
import { SymbolCode } from "@rmsm/market";
import { DecisionApplicationModule } from "../decision.module";
import { DECISION_REPOSITORY } from "../decision.tokens";
import { createIntegrationTestApp } from "../../common/testing/create-integration-test-app";
import type { DecisionRepository } from "@rmsm/decision";

function passingChecks(): RiskChecks {
  const pass = { passed: true };
  return { maxDailyLoss: pass, maxPositionSize: pass, exposureLimits: pass, correlationCheck: pass, marginCheck: pass };
}

function failingChecks(): RiskChecks {
  return { ...passingChecks(), marginCheck: { passed: false, message: "insufficient margin" } };
}

function buildDecision(id: string, checks: RiskChecks): Decision {
  const symbolCode = SymbolCode.create("EURUSD");
  const score = RiskScore.create(10);
  if (!symbolCode.ok || !score.ok) throw new Error("fixture failed");

  const riskAssessment = RiskAssessment.create(`${id}-ra`, { checks, overallScore: score.value, assessedAt: new Date() });
  const positionSize = PositionSize.create(`${id}-ps`, {
    symbolCode: symbolCode.value,
    units: 1000,
    calculationBasis: "test fixture",
    accountEquity: 10000,
    riskAmount: 200,
  });
  return Decision.create(id, { opportunityId: `${id}-opp`, riskAssessment, positionSize, createdAt: new Date() });
}

describe("Decision module (integration)", () => {
  let app: INestApplication;
  let repository: DecisionRepository;

  beforeAll(async () => {
    app = await createIntegrationTestApp(DecisionApplicationModule);
    repository = app.get(DECISION_REPOSITORY);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /decisions lists decisions seeded directly into the repository", async () => {
    await repository.save(buildDecision("dec-list-1", passingChecks()));
    const res = await request(app.getHttpServer()).get("/decisions").expect(200);
    expect(res.body.items.some((d: { id: string }) => d.id === "dec-list-1")).toBe(true);
  });

  it("PUT /decisions/:id/approve approves a decision whose risk assessment passed", async () => {
    await repository.save(buildDecision("dec-approve-1", passingChecks()));
    const res = await request(app.getHttpServer()).put("/decisions/dec-approve-1/approve").send({ comments: "looks good" }).expect(200);
    expect(res.body.status).toBe("APPROVED");
    expect(res.body.decidedBy).toBe("test-user-id");
  });

  it("PUT /decisions/:id/approve rejects (400) a decision whose risk assessment failed", async () => {
    await repository.save(buildDecision("dec-approve-2", failingChecks()));
    const res = await request(app.getHttpServer()).put("/decisions/dec-approve-2/approve").send({}).expect(400);
    expect(res.body.success).toBe(false);
  });

  it("PUT /decisions/:id/reject rejects a decision regardless of risk assessment outcome", async () => {
    await repository.save(buildDecision("dec-reject-1", failingChecks()));
    const res = await request(app.getHttpServer()).put("/decisions/dec-reject-1/reject").send({ comments: "too risky" }).expect(200);
    expect(res.body.status).toBe("REJECTED");
  });

  it("PUT /decisions/:id/approve returns 404 for an unknown decision", async () => {
    const res = await request(app.getHttpServer()).put("/decisions/does-not-exist/approve").send({}).expect(404);
    expect(res.body.success).toBe(false);
  });
});
