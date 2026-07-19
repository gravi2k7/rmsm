import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PortfolioApplicationModule } from "../portfolio.module";
import { createIntegrationTestApp } from "../../common/testing/create-integration-test-app";

describe("Portfolio module (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createIntegrationTestApp(PortfolioApplicationModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /portfolio returns the seeded default portfolio", async () => {
    const res = await request(app.getHttpServer()).get("/portfolio").expect(200);
    expect(res.body.id).toBe("default-portfolio");
    expect(res.body.cashBalance).toBe(100_000);
    expect(res.body.openPositionCount).toBe(0);
  });

  it("GET /positions returns a well-formed empty paginated list (no positions opened yet)", async () => {
    const res = await request(app.getHttpServer()).get("/positions").expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body).toHaveProperty("total", 0);
  });

  it("GET /trades returns a well-formed empty paginated list (no trades closed yet)", async () => {
    const res = await request(app.getHttpServer()).get("/trades").expect(200);
    expect(res.body.items).toEqual([]);
  });
});
