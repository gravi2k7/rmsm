import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Core send/read lifecycle (e2e). Uses channel=IN_APP throughout —
 * NotificationService.dispatch()'s IN_APP case is a genuine no-op (the
 * Notification row itself IS the delivery, per Phase 2c's design), so
 * this exercises the full send → list → read → archive → delete path
 * without needing any provider configured, the same reasoning that made
 * MOCK the right default provider for Module 004's billing checkout
 * tests.
 */
describe("Notification Send & Lifecycle (e2e)", () => {
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
    const org = await createTestOrganization(owner.userId, { slug: `test-org-notif-send-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  let notificationId: string;

  it("sends a DIRECT in-app notification to a specific recipient", async () => {
    const recipient = await createAuthenticatedActor(app);
    await addTestMember(organizationId, recipient.userId, "VIEWER");

    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({
        type: "DIRECT",
        channel: "IN_APP",
        recipientUserId: recipient.userId,
        subject: "Welcome",
        body: "Thanks for joining.",
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("SENT");
    notificationId = res.body.id;

    // Confirm the recipient (not the sender) can see it in their list
    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/notifications/organizations/${organizationId}`)
      .set("Authorization", bearer(recipient.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.items.some((n: { id: string }) => n.id === notificationId)).toBe(true);
  });

  it("rejects a DIRECT send with no recipientUserId", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", body: "orphaned" });
    expect(res.status).toBe(400);
  });

  it("rejects a send with neither templateKey nor body", async () => {
    const recipient = await createAuthenticatedActor(app);
    await addTestMember(organizationId, recipient.userId, "VIEWER");
    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", recipientUserId: recipient.userId });
    expect(res.status).toBe(400);
  });

  it("sends a bulk batch of notifications in one request", async () => {
    const r1 = await createAuthenticatedActor(app);
    const r2 = await createAuthenticatedActor(app);
    await addTestMember(organizationId, r1.userId, "VIEWER");
    await addTestMember(organizationId, r2.userId, "VIEWER");

    const res = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/bulk`)
      .set("Authorization", bearer(owner.accessToken))
      .send({
        notifications: [
          { type: "DIRECT", channel: "IN_APP", recipientUserId: r1.userId, body: "one" },
          { type: "DIRECT", channel: "IN_APP", recipientUserId: r2.userId, body: "two" },
        ],
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveLength(2);
  });

  it("the recipient marks their own notification read", async () => {
    const recipient = await createAuthenticatedActor(app);
    await addTestMember(organizationId, recipient.userId, "VIEWER");
    const sendRes = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", recipientUserId: recipient.userId, body: "read me" });
    const id = sendRes.body.id;

    const readRes = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/organizations/${organizationId}/${id}/read`)
      .set("Authorization", bearer(recipient.accessToken));
    expect(readRes.status).toBe(200);
    expect(readRes.body.status).toBe("READ");
    expect(readRes.body.readAt).not.toBeNull();
  });

  it("a non-recipient cannot mark someone else's notification read", async () => {
    const recipient = await createAuthenticatedActor(app);
    const outsider = await createAuthenticatedActor(app);
    await addTestMember(organizationId, recipient.userId, "VIEWER");
    await addTestMember(organizationId, outsider.userId, "VIEWER");
    const sendRes = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", recipientUserId: recipient.userId, body: "not yours" });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/organizations/${organizationId}/${sendRes.body.id}/read`)
      .set("Authorization", bearer(outsider.accessToken));
    expect(res.status).toBe(404);
  });

  it("archives then deletes a notification", async () => {
    const recipient = await createAuthenticatedActor(app);
    await addTestMember(organizationId, recipient.userId, "VIEWER");
    const sendRes = await request(app.getHttpServer())
      .post(`/api/v1/notifications/organizations/${organizationId}/send`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ type: "DIRECT", channel: "IN_APP", recipientUserId: recipient.userId, body: "archive me" });
    const id = sendRes.body.id;

    const archiveRes = await request(app.getHttpServer())
      .patch(`/api/v1/notifications/organizations/${organizationId}/${id}/archive`)
      .set("Authorization", bearer(recipient.accessToken));
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.status).toBe("ARCHIVED");

    const deleteRes = await request(app.getHttpServer())
      .delete(`/api/v1/notifications/organizations/${organizationId}/${id}`)
      .set("Authorization", bearer(recipient.accessToken));
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/notifications/organizations/${organizationId}/${id}`)
      .set("Authorization", bearer(recipient.accessToken));
    expect(getRes.status).toBe(404); // soft-deleted, excluded from reads
  });
});
