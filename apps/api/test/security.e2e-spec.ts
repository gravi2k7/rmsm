import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, createUnprivilegedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

describe("Security (e2e)", () => {
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
    const org = await createTestOrganization(owner.userId, { slug: `test-org-security-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("rejects every organization-scoped endpoint without a JWT", async () => {
    const getRes1 = await request(app.getHttpServer()).get(`/api/v1/organizations/${organizationId}`);
    expect(getRes1.status).toBe(401);

    const getRes2 = await request(app.getHttpServer()).get(`/api/v1/organizations/${organizationId}/members`);
    expect(getRes2.status).toBe(401);

    const getRes3 = await request(app.getHttpServer()).get(`/api/v1/organizations/${organizationId}/statistics`);
    expect(getRes3.status).toBe(401);

    const postRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/invite`)
      .send({ email: "nobody@example.com", role: "VIEWER" });
    expect(postRes.status).toBe(401);
  });

  it("rejects a FREE_USER-tier account (no SUBSCRIBER grant) from organization-management actions (platform permission required)", async () => {
    const unprivileged = await createUnprivilegedActor(app);
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(unprivileged.accessToken))
      .send({ name: "Should be denied" });
    // Denied either for lacking the platform permission (403 via
    // PermissionsGuard) or for not being an org member at all (403 via
    // OrganizationRoleGuard) — both guards independently reject this
    // request; either is a correct outcome here.
    expect(res.status).toBe(403);
  });

  it("denies cross-organization access even with a valid JWT and sufficient platform permission", async () => {
    const otherOwner = await createAuthenticatedActor(app);
    const otherOrg = await createTestOrganization(otherOwner.userId, { slug: `test-org-security-other-${Date.now()}` });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${otherOrg.id}/members`)
      .set("Authorization", bearer(owner.accessToken)); // owner of `organizationId`, not `otherOrg`
    expect(res.status).toBe(403);
  });

  it("hides soft-deleted organizations from reads even for the former Owner", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-security-softdel-${Date.now()}` });
    await prisma.organization.update({ where: { id: org.id }, data: { status: "DELETED", deletedAt: new Date() } });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${org.id}`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(404);
  });

  it("produces an audit log entry for a sensitive action performed through the real API", async () => {
    const before = await prisma.auditLog.count({ where: { entityType: "Organization", entityId: organizationId } });
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ description: "Triggers an audit log entry" });
    const after = await prisma.auditLog.count({ where: { entityType: "Organization", entityId: organizationId } });
    expect(after).toBeGreaterThan(before);
  });

  it("rejects a tampered/invalid invitation token", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations/invitations/accept")
      .set("Authorization", bearer(owner.accessToken))
      .send({ token: "clearly-not-a-real-token-abc123" });
    expect(res.status).toBe(400);
  });

  it("no privilege escalation: a VIEWER cannot grant themselves a higher role via updateMemberRole on their own membership", async () => {
    const viewer = await createAuthenticatedActor(app);
    const { addTestMember } = await import("./factories/organization.factory");
    await addTestMember(organizationId, viewer.userId, "VIEWER");
    const membership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId, userId: viewer.userId },
    });

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/members/${membership.id}/role`)
      .set("Authorization", bearer(viewer.accessToken))
      .send({ role: "ADMINISTRATOR" });
    expect(res.status).toBe(403); // VIEWER lacks the ADMIN_ORG_ROLES required for updateMemberRole
  });
});
