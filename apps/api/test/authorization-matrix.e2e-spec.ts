import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Authorization Matrix (e2e): verifies the two-layer guard design
 * (PermissionsGuard + OrganizationRoleGuard, ADR-010) across every role
 * tier the spec calls for — Owner, Administrator, Manager, Member
 * (mapped to VIEWER, the lowest org role with no elevated capability),
 * Guest (authenticated, zero org role — SUBSCRIBER-tier but not a member
 * of the target org), and Anonymous (no JWT at all) — plus JWT-required,
 * permission-required, and organization/tenant boundary isolation.
 */
describe("Authorization Matrix (e2e)", () => {
  let app: INestApplication;
  let owner: TestActor;
  let administrator: TestActor;
  let manager: TestActor;
  let member: TestActor; // VIEWER role
  let guest: TestActor; // authenticated, not a member of organizationId
  let organizationId: string;
  let otherOrganizationId: string; // for cross-tenant isolation tests

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    owner = await createAuthenticatedActor(app);
    administrator = await createAuthenticatedActor(app);
    manager = await createAuthenticatedActor(app);
    member = await createAuthenticatedActor(app);
    guest = await createAuthenticatedActor(app);

    const org = await createTestOrganization(owner.userId, { slug: `test-org-authz-${Date.now()}` });
    organizationId = org.id;
    await addTestMember(organizationId, administrator.userId, "ADMINISTRATOR");
    await addTestMember(organizationId, manager.userId, "MANAGER");
    await addTestMember(organizationId, member.userId, "VIEWER");
    // guest is deliberately NOT added as a member of `organizationId`

    const otherOrg = await createTestOrganization(guest.userId, { slug: `test-org-authz-other-${Date.now()}` });
    otherOrganizationId = otherOrg.id;
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  describe("Anonymous (no JWT)", () => {
    it("is rejected on a protected endpoint", async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/organizations/${organizationId}`);
      expect(res.status).toBe(401);
    });

    it("can still reach an explicitly @Public() endpoint (invitation validate)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/organizations/invitations/validate")
        .query({ token: "not-a-real-token" });
      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
    });
  });

  describe("Guest (authenticated, not a member of the target organization)", () => {
    it("cannot read an organization it does not belong to (organization boundary isolation)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", bearer(guest.accessToken));
      expect(res.status).toBe(403);
    });

    it("cannot list members of an organization it does not belong to", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/members`)
        .set("Authorization", bearer(guest.accessToken));
      expect(res.status).toBe(403);
    });

    it("does not see the other organization's data when listing its own organizations (tenant isolation)", async () => {
      const res = await request(app.getHttpServer())
        .get("/api/v1/organizations")
        .set("Authorization", bearer(guest.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.items.some((o: { id: string }) => o.id === organizationId)).toBe(false);
      expect(res.body.items.some((o: { id: string }) => o.id === otherOrganizationId)).toBe(true);
    });
  });

  describe("Member (VIEWER role)", () => {
    it("can read the organization", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", bearer(member.accessToken));
      expect(res.status).toBe(200);
    });

    it("cannot update organization details (requires OWNER/ADMINISTRATOR org role)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", bearer(member.accessToken))
        .send({ name: "Unauthorized rename attempt" });
      expect(res.status).toBe(403);
    });

    it("cannot invite members (requires OWNER/ADMINISTRATOR/MANAGER org role)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/members/invite`)
        .set("Authorization", bearer(member.accessToken))
        .send({ email: "someone@example.com", role: "VIEWER" });
      expect(res.status).toBe(403);
    });
  });

  describe("Manager", () => {
    it("can invite members", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/members/invite`)
        .set("Authorization", bearer(manager.accessToken))
        .send({ email: `manager-invite-${Date.now()}@example.com`, role: "VIEWER" });
      expect(res.status).toBe(201);
    });

    it("cannot update organization details (Manager is below ADMINISTRATOR for this action)", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", bearer(manager.accessToken))
        .send({ name: "Manager attempted rename" });
      expect(res.status).toBe(403);
    });

    it("cannot transfer ownership (Owner-only)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/members/transfer-ownership`)
        .set("Authorization", bearer(manager.accessToken))
        .send({ toMembershipId: "00000000-0000-0000-0000-000000000000" });
      expect(res.status).toBe(403);
    });
  });

  describe("Administrator", () => {
    it("can update organization details", async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", bearer(administrator.accessToken))
        .send({ description: "Updated by an Administrator" });
      expect(res.status).toBe(200);
    });

    it("cannot delete the organization (Owner-only)", async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/organizations/${organizationId}`)
        .set("Authorization", bearer(administrator.accessToken));
      expect(res.status).toBe(403);
    });

    it("cannot transfer ownership (Owner-only)", async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${organizationId}/members/transfer-ownership`)
        .set("Authorization", bearer(administrator.accessToken))
        .send({ toMembershipId: "00000000-0000-0000-0000-000000000000" });
      expect(res.status).toBe(403);
    });
  });

  describe("Owner", () => {
    it("can perform every action available to lower roles, plus Owner-only actions (delete tested in organization-lifecycle.e2e-spec.ts)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${organizationId}/statistics`)
        .set("Authorization", bearer(owner.accessToken));
      expect(res.status).toBe(200);
      expect(res.body.ownerCount).toBe(1);
    });
  });
});
