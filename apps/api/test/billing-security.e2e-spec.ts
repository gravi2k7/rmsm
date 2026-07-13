import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, createUnprivilegedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

describe("Billing Security (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  let organizationId: string;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    owner = await createAuthenticatedActor(app);
    const org = await createTestOrganization(owner.userId, { slug: `test-org-billing-security-${Date.now()}` });
    organizationId = org.id;
    await request(app.getHttpServer())
      .post(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ planKey: "free", billingCycle: "MONTHLY", billingEmail: owner.email });
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("rejects every organization-scoped billing endpoint without a JWT", async () => {
    const res1 = await request(app.getHttpServer()).get(
      `/api/v1/billing/organizations/${organizationId}/subscription`,
    );
    expect(res1.status).toBe(401);

    const res2 = await request(app.getHttpServer()).get(
      `/api/v1/billing/organizations/${organizationId}/invoices`,
    );
    expect(res2.status).toBe(401);

    const res3 = await request(app.getHttpServer()).get(`/api/v1/billing/organizations/${organizationId}/usage`);
    expect(res3.status).toBe(401);
  });

  it("denies a user who is not a member of the organization (cross-organization access)", async () => {
    const outsider = await createAuthenticatedActor(app);
    const res = await request(app.getHttpServer())
      .get(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(outsider.accessToken));
    expect(res.status).toBe(403);
  });

  it("denies a FREE_USER-tier account from managing billing (platform permission required)", async () => {
    const unprivileged = await createUnprivilegedActor(app);
    await addTestMember(organizationId, unprivileged.userId, "ADMINISTRATOR");
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(unprivileged.accessToken))
      .send({ planKey: "starter" });
    // Even with a sufficient org role (ADMINISTRATOR), createUnprivilegedActor()
    // grants no platform role at all — PermissionsGuard should reject this
    // before OrganizationRoleGuard's org-role check is ever reached.
    expect(res.status).toBe(403);
  });

  it("denies a VIEWER-role member from managing the subscription (org role required)", async () => {
    const viewer = await createAuthenticatedActor(app);
    await addTestMember(organizationId, viewer.userId, "VIEWER");
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(viewer.accessToken));
    expect(res.status).toBe(403);
  });

  it("allows a VIEWER-role member to read (but not manage) billing data", async () => {
    const viewer2 = await createAuthenticatedActor(app);
    await addTestMember(organizationId, viewer2.userId, "VIEWER");
    const res = await request(app.getHttpServer())
      .get(`/api/v1/billing/organizations/${organizationId}/subscription`)
      .set("Authorization", bearer(viewer2.accessToken));
    expect(res.status).toBe(200);
  });

  it("denies non-admin accounts from the platform-wide admin billing endpoints", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/billing/admin/plans")
      .set("Authorization", bearer(owner.accessToken)); // SUBSCRIBER-tier, not ADMIN/SUPER_ADMIN
    expect(res.status).toBe(403);
  });

  it("rejects an invalid UUID in an organizationId route param", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/billing/organizations/not-a-uuid/subscription")
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(400);
  });

  it("public plan listing does not require authentication", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/billing/plans");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
