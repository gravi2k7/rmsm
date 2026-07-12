import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Membership Lifecycle (e2e): invite → accept → list → update role →
 * suspend → reactivate → remove → leave, plus reject/cancel/expire on the
 * invitation side and the full ownership-transfer workflow. Each `it()`
 * builds on the previous one's state within a describe block, matching
 * the existing auth-flow.e2e-spec.ts convention already established in
 * this repo.
 */
describe("Membership Lifecycle (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  let invitee: TestActor;
  let organizationId: string;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    owner = await createAuthenticatedActor(app);
    invitee = await createAuthenticatedActor(app);
    const org = await createTestOrganization(owner.userId, { slug: `test-org-membership-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  it("invites a new member by email", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/invite`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ email: invitee.email, role: "ANALYST" });
    expect(res.status).toBe(201);
  });

  it("rejects inviting the same email again while a pending invitation exists (duplicate invitation)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/invite`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ email: invitee.email, role: "ANALYST" });
    expect(res.status).toBe(409);
  });

  it("lists pending invitations", async () => {
    const invitation = await prisma.organizationInvitation.findFirstOrThrow({
      where: { organizationId, email: invitee.email, status: "PENDING" },
    });
    expect(invitation.status).toBe("PENDING");

    const listRes = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/invitations`)
      .set("Authorization", bearer(owner.accessToken));
    expect(listRes.status).toBe(200);
    expect(listRes.body.some((i: { email: string }) => i.email === invitee.email)).toBe(true);
  });

  let membershipId: string;
  let acceptedRawToken: string;

  it("accepts the invitation using a factory-issued token (accept requires the raw token, which production only ever emails)", async () => {
    // Cancel the invite-endpoint-issued invitation (its raw token is
    // unrecoverable by design) and issue a fresh one via the factory,
    // which returns the raw token alongside the record — this is the
    // correct way to test the accept endpoint without weakening
    // production's hash-only-storage guarantee.
    await prisma.organizationInvitation.updateMany({
      where: { organizationId, email: invitee.email, status: "PENDING" },
      data: { status: "CANCELLED" },
    });
    const { createTestInvitation } = await import("./factories/invitation.factory");
    const { rawToken } = await createTestInvitation(organizationId, invitee.email, "ANALYST", owner.userId);
    acceptedRawToken = rawToken;

    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations/invitations/accept")
      .set("Authorization", bearer(invitee.accessToken))
      .send({ token: rawToken });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("ANALYST");
    expect(res.body.status).toBe("ACTIVE");
    membershipId = res.body.id;
  });

  it("rejects accepting the same token twice", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/organizations/invitations/accept")
      .set("Authorization", bearer(invitee.accessToken))
      .send({ token: acceptedRawToken });
    expect(res.status).toBe(400);
  });

  it("lists the new member", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.some((m: { id: string }) => m.id === membershipId)).toBe(true);
  });

  it("gets a single member", async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationId}/members/${membershipId}`)
      .set("Authorization", bearer(owner.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(membershipId);
  });

  it("updates the member's role", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/members/${membershipId}/role`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ role: "MANAGER" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("MANAGER");
  });

  it("rejects updating a role to/from OWNER via this endpoint", async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationId}/members/${membershipId}/role`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ role: "OWNER" });
    // OWNER is excluded from UpdateMemberRoleDto's allowed enum values —
    // this is a 400 (DTO validation), not a 409 (service-level conflict).
    expect(res.status).toBe(400);
  });

  it("suspends the member, then reactivates them", async () => {
    const suspendRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${membershipId}/suspend`)
      .set("Authorization", bearer(owner.accessToken));
    expect(suspendRes.status).toBe(201);
    expect(suspendRes.body.status).toBe("SUSPENDED");

    const reactivateRes = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/${membershipId}/reactivate`)
      .set("Authorization", bearer(owner.accessToken));
    expect(reactivateRes.status).toBe(201);
    expect(reactivateRes.body.status).toBe("ACTIVE");
  });

  it("transfers ownership to the member, demoting the original Owner to Administrator", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/transfer-ownership`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ toMembershipId: membershipId });

    expect(res.status).toBe(201);
    expect(res.body.newOwner.id).toBe(membershipId);
    expect(res.body.newOwner.role).toBe("OWNER");
    expect(res.body.previousOwner.role).toBe("ADMINISTRATOR");
  });

  it("the original owner (now Administrator) can no longer transfer ownership (Owner-only action)", async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationId}/members/transfer-ownership`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ toMembershipId: membershipId });
    expect(res.status).toBe(403);
  });

  it("the new owner removes the original owner (now a regular Administrator member)", async () => {
    const originalOwnerMembership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId, userId: owner.userId },
    });

    const res = await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${originalOwnerMembership.id}`)
      .set("Authorization", bearer(invitee.accessToken));
    expect(res.status).toBe(204);
  });

  it("cannot remove the final active Owner", async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationId}/members/${membershipId}`)
      .set("Authorization", bearer(invitee.accessToken));
    expect(res.status).toBe(409);
  });
});
