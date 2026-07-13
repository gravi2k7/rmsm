import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, createUnprivilegedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

describe("Notification Security (e2e)", () => {
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
    const org = await createTestOrganization(owner.userId, { slug: `test-org-notif-security-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("rejects sending without a JWT", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .send({ type: "DIRECT", channel: "IN_APP", body: "no auth" });
    expect(res.status).toBe(401);
  });

  it("denies a non-member from sending into an organization they don't belong to", async () => {
    const outsider = await createAuthenticatedActor(app);
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(outsider.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", body: "cross-org" });
    expect(res.status).toBe(403);
  });

  it("denies a VIEWER-role member from sending (org role required)", async () => {
    const viewer = await createAuthenticatedActor(app);
    await addTestMember(organizationId, viewer.userId, "VIEWER");
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(viewer.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", body: "viewer cannot send" });
    expect(res.status).toBe(403);
  });

  it("denies a FREE_USER-tier account from sending (platform permission required)", async () => {
    const unprivileged = await createUnprivilegedActor(app);
    await addTestMember(organizationId, unprivileged.userId, "MANAGER");
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(unprivileged.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", body: "no permission" });
    expect(res.status).toBe(403);
  });

  it("denies a non-admin from the platform-wide admin provider endpoints", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/notifications/admin/providers/email")
      .set("Authorization", bearer(owner.accessToken)); // SUBSCRIBER-tier, not ADMIN/SUPER_ADMIN
    expect(res.status).toBe(403);
  });

  it("device token registration is self-service — succeeds with only a valid JWT, no org role needed", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/notifications/devices")
      .set("Authorization", bearer(owner.accessToken))
      .send({ platform: "WEB", token: `test-device-token-${Date.now()}` });
    expect(res.status).toBe(201);
  });

  it("rejects an inbound webhook with an invalid/unconfigured provider", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/webhooks/not_a_real_provider/organizations/${organizationId}`)
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ fake: true }));
    expect(res.status).toBe(400);
  });
});
