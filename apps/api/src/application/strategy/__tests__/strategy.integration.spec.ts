import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { StrategyApplicationModule } from "../strategy.module";
import { createIntegrationTestApp } from "../../common/testing/create-integration-test-app";

describe("Strategy module (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createIntegrationTestApp(StrategyApplicationModule);
  });

  afterAll(async () => {
    await app.close();
  });

  const validCreatePayload = {
    name: "MA Crossover",
    description: "Buys when the fast MA crosses above the slow MA.",
    riskTolerance: "MEDIUM",
    maxRiskPerTrade: 0.02,
    maxLeverage: 10,
    maxOpenPositions: 5,
    timeframe: "1h",
    supportedSymbols: ["EURUSD"],
  };

  it("POST /strategies creates a strategy and returns it, starting DRAFT/disabled", async () => {
    const res = await request(app.getHttpServer()).post("/strategies").send(validCreatePayload).expect(201);

    expect(res.body.name).toBe("MA Crossover");
    expect(res.body.status).toBe("DRAFT");
    expect(res.body.enabled).toBe(false);
    expect(res.body.id).toBeDefined();
  });

  it("POST /strategies rejects invalid input with a 400 and a real validation error", async () => {
    const res = await request(app.getHttpServer())
      .post("/strategies")
      .send({ ...validCreatePayload, maxRiskPerTrade: 5 }) // out of 0-1 range
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it("GET /strategies lists what was created, paginated", async () => {
    const res = await request(app.getHttpServer()).get("/strategies").expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty("total");
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("pageSize");
  });

  it("GET /strategies/:id returns the created strategy", async () => {
    const created = await request(app.getHttpServer()).post("/strategies").send(validCreatePayload);
    const res = await request(app.getHttpServer()).get(`/strategies/${created.body.id}`).expect(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it("GET /strategies/:id returns 404 for an unknown (but validly-shaped) id", async () => {
    const res = await request(app.getHttpServer()).get("/strategies/00000000-0000-4000-8000-000000000000").expect(404);
    expect(res.body.success).toBe(false);
  });

  it("PUT /strategies/:id transitions status DRAFT -> TESTING", async () => {
    const created = await request(app.getHttpServer()).post("/strategies").send(validCreatePayload);
    const res = await request(app.getHttpServer()).put(`/strategies/${created.body.id}`).send({ status: "TESTING" }).expect(200);
    expect(res.body.status).toBe("TESTING");
  });

  it("PUT /strategies/:id rejects an invalid lifecycle transition with a 409", async () => {
    const created = await request(app.getHttpServer()).post("/strategies").send(validCreatePayload);
    // DRAFT -> PRODUCTION is not a legal direct transition
    const res = await request(app.getHttpServer()).put(`/strategies/${created.body.id}`).send({ status: "PRODUCTION" }).expect(409);
    expect(res.body.success).toBe(false);
  });

  it("PUT /strategies/:id toggles enabled", async () => {
    const created = await request(app.getHttpServer()).post("/strategies").send(validCreatePayload);
    const res = await request(app.getHttpServer()).put(`/strategies/${created.body.id}`).send({ enabled: true }).expect(200);
    expect(res.body.enabled).toBe(true);
  });

  it("DELETE /strategies/:id archives the strategy", async () => {
    const created = await request(app.getHttpServer()).post("/strategies").send(validCreatePayload);
    await request(app.getHttpServer()).delete(`/strategies/${created.body.id}`).expect(200);

    const after = await request(app.getHttpServer()).get(`/strategies/${created.body.id}`).expect(200);
    expect(after.body.status).toBe("ARCHIVED");
  });
});
