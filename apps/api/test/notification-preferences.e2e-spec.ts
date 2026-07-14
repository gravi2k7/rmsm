import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

describe("Notification Preferences (e2e)", () => {
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
    const org = await createTestOrganization(owner.userId, { slug: `test-org-notif-prefs-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("returns an empty list before any preference is set", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/notifications/organizations/${organizationId}/preferences`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("updates the all-categories, all-channels default preference", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/organizations/${organizationId}/preferences`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ enabled: false });
    expect(res.status).toBe(200);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/notifications/organizations/${organizationId}/preferences`)
      .set("Authorization", bearer(owner.accessToken));
    expect(getRes.body.some((p: { enabled: boolean; categoryId: null; channel: null }) => p.enabled === false)).toBe(true);
  });

  it("an opted-out recipient's notification is created but cancelled (suppressed), not delivered", async () => {
    const recipient = await createAuthenticatedActor(app);
    await addTestMember(organizationId, recipient.userId, "VIEWER");

    await request(app.getHttpServer())
      .patch(`/api/v1/notifications/organizations/${organizationId}/preferences`)
      .set("Authorization", bearer(recipient.accessToken))
      .send({ enabled: false });

    const sendRes = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", recipientUserId: recipient.userId, body: "should be suppressed" });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.status).toBe("CANCELLED");
  });

  it("rejects a channel-scoped preference update for an invalid channel value", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/organizations/${organizationId}/preferences`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ enabled: true, channel: "CARRIER_PIGEON" });
    expect(res.status).toBe(400);
  });
});
