import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { setMembershipStatus } from "./factories/membership.factory";
import { createTestInvitation } from "./factories/invitation.factory";
import { prisma } from "@rmsm/database";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

describe("Validation Rules (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  let organizationId: string;
  let slug: string;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    owner = await createAuthenticatedActor(app);
    slug = `test-org-validation-${Date.now()}`;
    const org = await createTestOrganization(owner.userId, { slug });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("rejects creating an organization with a duplicate slug", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Authorization", bearer(owner.accessToken))
      .send({ name: "Duplicate Slug Attempt", slug });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid email on invite", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/invite`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ email: "not-an-email", role: "VIEWER" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid UUID in a route param", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations/not-a-uuid")
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(400);
  });

  it("returns 404 for a well-formed but nonexistent organization id", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/organizations/00000000-0000-0000-0000-000000000000")
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(404);
  });

  it("rejects a create-organization request missing required fields", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations")
      .set("Authorization", bearer(owner.accessToken))
      .send({});
    expect(res.status).toBe(400);
  });

  it("rejects an invalid (non-enum) role value", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/invite`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ email: "valid@example.com", role: "SUPREME_LEADER" });
    expect(res.status).toBe(400);
  });

  it("cannot remove the final active Owner", async () => {
    const ownerMembership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId, userId: owner.userId },
    });
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${ownerMembership.id}`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(409);
  });

  it("cannot transfer ownership to a suspended member", async () => {
    const suspendedActor = await createAuthenticatedActor(app);
    await addTestMember(organizationId, suspendedActor.userId, "MANAGER");
    const membership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId, userId: suspendedActor.userId },
    });
    await setMembershipStatus(membership.id, "SUSPENDED");

    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/transfer-ownership`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ toMembershipId: membership.id });
    expect(res.status).toBe(409);
  });

  it("cannot invite an email that is already an active member", async () => {
    const existingMember = await createAuthenticatedActor(app);
    await addTestMember(organizationId, existingMember.userId, "VIEWER");

    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/invite`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ email: existingMember.email, role: "ANALYST" });
    expect(res.status).toBe(409);
  });

  it("cannot accept an expired invitation", async () => {
    const invitee = await createAuthenticatedActor(app);
    const { rawToken } = await createTestInvitation(organizationId, invitee.email, "VIEWER", owner.userId, {
      expiresAt: new Date(Date.now() - 1000), // already expired
    });

    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations/invitations/accept")
      .set("Authorization", bearer(invitee.accessToken))
      .send({ token: rawToken });
    expect(res.status).toBe(400);
  });

  it("rejects accepting an invitation whose email doesn't match the authenticated account", async () => {
    const invitee = await createAuthenticatedActor(app);
    const mismatchedActor = await createAuthenticatedActor(app);
    const { rawToken } = await createTestInvitation(organizationId, invitee.email, "VIEWER", owner.userId);

    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations/invitations/accept")
      .set("Authorization", bearer(mismatchedActor.accessToken))
      .send({ token: rawToken });
    expect(res.status).toBe(400);
  });
});
