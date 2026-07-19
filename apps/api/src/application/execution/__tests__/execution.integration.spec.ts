import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ExecutionApplicationModule } from "../execution.module";
import { createIntegrationTestApp } from "../../common/testing/create-integration-test-app";

describe("Execution module (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createIntegrationTestApp(ExecutionApplicationModule);
  });

  afterAll(async () => {
    await app.close();
  });

  const validMarketOrder = {
    decisionId: "123e4567-e89b-12d3-a456-426614174000",
    symbolCode: "EURUSD",
    side: "BUY",
    type: "MARKET",
    quantityUnits: 10000,
    pricePrecision: 5,
  };

  it("POST /orders creates a MARKET order in PENDING status", async () => {
    const res = await request(app.getHttpServer()).post("/orders").send(validMarketOrder).expect(201);
    expect(res.body.status).toBe("PENDING");
    expect(res.body.symbolCode).toBe("EURUSD");
    expect(res.body.id).toBeDefined();
  });

  it("POST /orders rejects a LIMIT order with no limitPrice", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .send({ ...validMarketOrder, type: "LIMIT" })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it("POST /orders accepts a well-formed LIMIT order", async () => {
    const res = await request(app.getHttpServer())
      .post("/orders")
      .send({ ...validMarketOrder, type: "LIMIT", limitPrice: 1.1 })
      .expect(201);
    expect(res.body.limitPrice).toBe(1.1);
  });

  it("GET /orders lists what was created, paginated", async () => {
    const res = await request(app.getHttpServer()).get("/orders").expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it("GET /executions lists a tracking Execution for each created order", async () => {
    await request(app.getHttpServer()).post("/orders").send(validMarketOrder);
    const res = await request(app.getHttpServer()).get("/executions").expect(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items[0]).toHaveProperty("status", "IN_PROGRESS");
  });
});
