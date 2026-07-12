import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Organization Lifecycle (e2e): create → read → update → settings →
 * archive → restore → soft delete → search. Exercises the full
 * repository → service → controller → REST API → database stack per
 * Phase 5's explicit requirement — no layer is mocked.
 */
describe("Organization Lifecycle (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    owner = await createAuthenticatedActor(app);
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  const slug = `test-org-lifecycle-${Date.now()}`;
  let organizationId: string;

  it("creates an organization and the caller becomes Owner", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Authorization", bearer(owner.accessToken))
      .send({ name: "Lifecycle Test Org", slug });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe(slug);
    organizationId = res.body.id;

    const membersRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", bearer(owner.accessToken));
    expect(membersRes.status).toBe(200);
    expect(membersRes.body).toHaveLength(1);
    expect(membersRes.body[0].role).toBe("OWNER");
    expect(membersRes.body[0].userId).toBe(owner.userId);
  });

  it("reads the organization by id", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(organizationId);
    expect(res.body.status).toBe("ACTIVE");
  });

  it("updates organization details, but slug is not accepted by the update DTO", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ name: "Renamed Lifecycle Org", slug: "attempted-slug-change" });

    // whitelist: true strips unknown/disallowed fields silently rather
    // than erroring, since UpdateOrganizationDto simply has no `slug`
    // property — this asserts the field had no effect, not that the
    // request was rejected.
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Lifecycle Org");
    expect(res.body.slug).toBe(slug);
  });

  it("updates organization settings", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/settings`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ settings: { branding: { primaryColor: "#123456" } } });

    expect(res.status).toBe(200);
    expect(res.body.settings).toEqual({ branding: { primaryColor: "#123456" } });
  });

  it("archives the organization, then restores it", async () => {
    const archiveRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/archive`)
      .set("Authorization", bearer(owner.accessToken));
    expect(archiveRes.status).toBe(201);
    expect(archiveRes.body.status).toBe("ARCHIVED");

    const restoreRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/restore`)
      .set("Authorization", bearer(owner.accessToken));
    expect(restoreRes.status).toBe(201);
    expect(restoreRes.body.status).toBe("ACTIVE");
  });

  it("lists/searches organizations the caller belongs to", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations")
      .query({ search: "Renamed Lifecycle" })
      .set("Authorization", bearer(owner.accessToken));

    expect(res.status).toBe(200);
    expect(res.body.items.some((o: { id: string }) => o.id === organizationId)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it("soft-deletes the organization", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("DELETED");
  });

  it("no longer returns the soft-deleted organization from GET (soft-deleted records hidden)", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(404);
  });
});
