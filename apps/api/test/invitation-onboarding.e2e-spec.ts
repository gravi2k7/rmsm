import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization } from "./factories/organization.factory";
import { createTestInvitation } from "./factories/invitation.factory";
import { createTestEmailVerification } from "./factories/email-verification.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * WM-020F Scenario 2 (Enterprise Invitation) + Scenario 6 (Invitation
 * Expired) — Path B from WM-020F's own spec: Invitation -> Register ->
 * Verify Email -> Accept Invitation -> Join Organization -> Assign
 * Invited Role, for a genuinely *new* (not-yet-registered) invitee — the
 * one path membership-lifecycle.e2e-spec.ts's existing invitation
 * coverage doesn't exercise (its invitee is already an authenticated
 * actor accepting directly; this exercises OnboardingService's
 * acceptInvitationBranch(), reached only via register+verify).
 *
 * Duplicate invitation (inviting the same pending email twice) is already
 * covered end-to-end in membership-lifecycle.e2e-spec.ts and isn't
 * repeated here.
 */
describe("Invitation Onboarding (e2e)", () => {
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
    const org = await createTestOrganization(owner.userId, { slug: `test-org-invitation-onboarding-${Date.now()}` });
    organizationId = org.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe("Scenario 2 — a brand-new (not-yet-registered) invitee", () => {
    const inviteeEmail = `test-user-invitee-${Date.now()}@example.com`;
    const password = "Str0ng!Passw0rd123";
    let inviteRawToken: string;
    let inviteeUserId: string;

    it("owner invites a not-yet-registered email as MANAGER", async () => {
      const { rawToken } = await createTestInvitation(organizationId, inviteeEmail, "MANAGER", owner.userId);
      inviteRawToken = rawToken;

      const invitation = await prisma.organizationInvitation.findFirstOrThrow({
        where: { organizationId, email: inviteeEmail },
      });
      expect(invitation.status).toBe("PENDING");
      expect(invitation.role).toBe("MANAGER");
    });

    it("the invitee registers, forwarding the invitation token (as /signup does)", async () => {
      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send({ email: inviteeEmail, password, firstName: "Invited", lastName: "User", invitationToken: inviteRawToken });
      expect(res.status).toBe(201);

      const user = await prisma.user.findUniqueOrThrow({ where: { email: inviteeEmail } });
      inviteeUserId = user.id;
    });

    it("completing onboarding accepts the invitation instead of creating a new organization (acceptInvitationBranch)", async () => {
      const { rawToken: emailToken } = await createTestEmailVerification(inviteeUserId);

      const res = await request(app.getHttpServer())
        .post("/api/v1/onboarding/verify-email")
        .send({ token: emailToken, invitationToken: inviteRawToken });

      expect(res.status).toBe(201);
      expect(res.body.source).toBe("invitation_accepted");
      expect(res.body.organizationId).toBe(organizationId);
      expect(res.body.role).toBe("MANAGER");
    });

    it("joined the existing organization with the invited role — no second organization created for this user", async () => {
      const memberships = await prisma.organizationMembership.findMany({ where: { userId: inviteeUserId } });
      expect(memberships).toHaveLength(1);
      expect(memberships[0]).toMatchObject({ organizationId, role: "MANAGER", status: "ACTIVE" });

      const ownedOrgs = await prisma.organization.findMany({ where: { createdById: inviteeUserId } });
      expect(ownedOrgs).toHaveLength(0);
    });

    it("the invitation is now ACCEPTED, and an invitation-accepted audit entry exists", async () => {
      const invitation = await prisma.organizationInvitation.findFirstOrThrow({
        where: { organizationId, email: inviteeEmail },
      });
      expect(invitation.status).toBe("ACCEPTED");

      const audit = await prisma.auditLog.findFirst({
        where: { action: "organization.invitation.accepted", userId: inviteeUserId },
      });
      expect(audit).toBeTruthy();
    });

    it("the new member can log in and see the organization via a protected, org-scoped endpoint", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email: inviteeEmail, password });
      expect(loginRes.status).toBe(200);

      const membersRes = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/members`)
        .set("Authorization", bearer(loginRes.body.tokens.accessToken));
      expect(membersRes.status).toBe(200);
      expect(membersRes.body.some((m: { userId: string }) => m.userId === inviteeUserId)).toBe(true);
    });
  });

  describe("Scenario 6 — expired invitation", () => {
    it("the public validate endpoint reports an expired invitation as invalid, without distinguishing why (no enumeration)", async () => {
      const expiredEmail = `test-user-expired-invitee-${Date.now()}@example.com`;
      const { rawToken } = await createTestInvitation(organizationId, expiredEmail, "VIEWER", owner.userId, {
        expiresAt: new Date(Date.now() - 60_000),
      });

      const res = await request(app.getHttpServer()).get(
        `/api/v1/organizations/invitations/validate?token=${encodeURIComponent(rawToken)}`,
      );
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ valid: false });
    });

    it("an authenticated holder of an expired invitation cannot accept it, and no membership is created", async () => {
      const invitee = await createAuthenticatedActor(app);
      const { rawToken } = await createTestInvitation(organizationId, invitee.email, "VIEWER", owner.userId, {
        expiresAt: new Date(Date.now() - 60_000),
      });

      const res = await request(app.getHttpServer())
        .post("/api/v1/organizations/invitations/accept")
        .set("Authorization", bearer(invitee.accessToken))
        .send({ token: rawToken });

      expect(res.status).toBe(400);

      const membership = await prisma.organizationMembership.findFirst({
        where: { organizationId, userId: invitee.userId },
      });
      expect(membership).toBeNull();
    });
  });
});
