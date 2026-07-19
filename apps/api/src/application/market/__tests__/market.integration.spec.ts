import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { MarketApplicationModule } from "../market.module";
import { createIntegrationTestApp } from "../../common/testing/create-integration-test-app";

describe("Market module (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createIntegrationTestApp(MarketApplicationModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /markets returns the seeded exchanges", async () => {
    const res = await request(app.getHttpServer()).get("/markets").expect(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    expect(res.body.items.some((e: { id: string }) => e.id === "forex")).toBe(true);
  });

  it("GET /markets/:id returns a specific seeded exchange", async () => {
    const res = await request(app.getHttpServer()).get("/markets/forex").expect(200);
    expect(res.body.name).toBe("Global Forex Market");
  });

  it("GET /markets/:id returns 404 for an unknown exchange", async () => {
    const res = await request(app.getHttpServer()).get("/markets/does-not-exist").expect(404);
    expect(res.body.success).toBe(false);
  });

  it("GET /symbols returns the seeded symbols", async () => {
    const res = await request(app.getHttpServer()).get("/symbols").expect(200);
    expect(res.body.items.some((s: { code: string }) => s.code === "EURUSD")).toBe(true);
  });

  it("GET /candles requires symbolCode and timeframe", async () => {
    const res = await request(app.getHttpServer()).get("/candles").expect(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /candles returns an empty (but well-formed) paginated list when no candles exist yet", async () => {
    const res = await request(app.getHttpServer()).get("/candles").query({ symbolCode: "EURUSD", timeframe: "1h" }).expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
