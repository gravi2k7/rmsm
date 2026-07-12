import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * API Contract — verifies the shape of responses and errors matches what
 * every module since Module 002 already guarantees (GlobalExceptionFilter's
 * ApiResponse<T> envelope, pagination shape, whitelist stripping) rather
 * than assuming Phase 4's controllers happen to produce the right shape.
 */
describe("API Contract (e2e)", () => {
  let app: INestApplication;
  let actor: TestActor;
  let organizationId: string;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    actor = await createAuthenticatedActor(app);
    const org = await createTestOrganization(actor.userId, { slug: `test-org-contract-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("error responses use the standard ApiResponse envelope with success:false and a code", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations/00000000-0000-0000-0000-000000000000")
      .set("Authorization", bearer(actor.accessToken));
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toMatchObject({ code: "NOT_FOUND" });
  });

  it("validation errors return 400 with details", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Authorization", bearer(actor.accessToken))
      .send({ slug: "no-name-field" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("silently strips unknown fields (whitelist: true) rather than passing them through", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(actor.accessToken))
      .send({ name: "Contract Test Org", notAField: "should be stripped" });
    expect(res.status).toBe(200);
    expect(res.body.notAField).toBeUndefined();
  });

  it("pagination response shape includes items and total", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations")
      .query({ page: 1, pageSize: 10 })
      .set("Authorization", bearer(actor.accessToken));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe("number");
  });

  it("rejects a pageSize above the DTO's maximum", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations")
      .query({ pageSize: 1000 })
      .set("Authorization", bearer(actor.accessToken));
    expect(res.status).toBe(400);
  });

  it("filtering by status only returns matching organizations", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations")
      .query({ status: "ACTIVE" })
      .set("Authorization", bearer(actor.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.items.every((o: { status: string }) => o.status === "ACTIVE")).toBe(true);
  });

  it("Swagger JSON is served and includes an operationId for a known endpoint", async () => {
    const res = await request(app.getHttpServer()).get("/api/docs-json");
    expect(res.status).toBe(200);
    const paths = res.body.paths;
    expect(paths).toHaveProperty("/api/v1/organizations");
    const createOp = paths["/api/v1/organizations"].post;
    expect(createOp.operationId).toBe("createOrganization");
  });
});
