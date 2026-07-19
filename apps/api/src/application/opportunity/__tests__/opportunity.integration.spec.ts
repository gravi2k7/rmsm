import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { OpportunityApplicationModule } from "../opportunity.module";
import { createIntegrationTestApp } from "../../common/testing/create-integration-test-app";

describe("Opportunity module (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createIntegrationTestApp(OpportunityApplicationModule);
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /opportunities returns a well-formed empty paginated list (nothing seeded this phase)", async () => {
    const res = await request(app.getHttpServer()).get("/opportunities").expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body).toHaveProperty("total", 0);
    expect(res.body).toHaveProperty("page");
    expect(res.body).toHaveProperty("pageSize");
  });

  it("GET /opportunities accepts pagination query params", async () => {
    const res = await request(app.getHttpServer()).get("/opportunities").query({ page: 2, pageSize: 10 }).expect(200);
    expect(res.body.page).toBe(2);
    expect(res.body.pageSize).toBe(10);
  });

  it("GET /opportunities rejects an out-of-range pageSize", async () => {
    const res = await request(app.getHttpServer()).get("/opportunities").query({ pageSize: 10000 }).expect(400);
    expect(res.body.success).toBe(false);
  });
});
