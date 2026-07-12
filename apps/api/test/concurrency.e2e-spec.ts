import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Concurrency (e2e): fires genuinely simultaneous requests via
 * `Promise.all()` against the real HTTP server and asserts the invariants
 * Decision 1 (Phase 3) was built to protect survive contention — not
 * simulated with mocks, since the whole point is proving the
 * re-verify-inside-the-transaction pattern actually closes the race
 * window under real concurrent load.
 */
describe("Concurrency (e2e)", () => {
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

  it("exactly one of two concurrent ownership-transfer requests succeeds; the other sees a conflict, and the organization ends with exactly one active Owner", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-transfer-${Date.now()}` });
    const candidateA = await createAuthenticatedActor(app);
    const candidateB = await createAuthenticatedActor(app);
    await addTestMember(org.id, candidateA.userId, "MANAGER");
    await addTestMember(org.id, candidateB.userId, "MANAGER");
    const membershipA = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId: org.id, userId: candidateA.userId },
    });
    const membershipB = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId: org.id, userId: candidateB.userId },
    });

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/members/transfer-ownership`)
        .set("Authorization", bearer(owner.accessToken))
        .send({ toMembershipId: membershipA.id }),
      request(app.getHttpServer())
        .post(`/api/v1/organizations/${org.id}/members/transfer-ownership`)
        .set("Authorization", bearer(owner.accessToken))
        .send({ toMembershipId: membershipB.id }),
    ]);

    const statuses = [resA.status, resB.status].sort();
    // One succeeds (201), the other is rejected as a conflict (409) —
    // never both succeeding, which would mean two Owners existed even
    // momentarily.
    expect(statuses).toEqual([201, 409]);

    const activeOwners = await prisma.organizationMembership.count({
      where: { organizationId: org.id, role: "OWNER", status: "ACTIVE" },
    });
    expect(activeOwners).toBe(1);
  });

  it("owner uniqueness holds even under N concurrent transfer attempts to N different targets", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-n-way-${Date.now()}` });
    const candidates: TestActor[] = [];
    const membershipIds: string[] = [];
    for (let i = 0; i < 5; i++) {
      const candidate = await createAuthenticatedActor(app);
      await addTestMember(org.id, candidate.userId, "MANAGER");
      const membership = await prisma.organizationMembership.findFirstOrThrow({
        where: { organizationId: org.id, userId: candidate.userId },
      });
      candidates.push(candidate);
      membershipIds.push(membership.id);
    }

    const results = await Promise.all(
      membershipIds.map((toMembershipId) =>
        request(app.getHttpServer())
          .post(`/api/v1/organizations/${org.id}/members/transfer-ownership`)
          .set("Authorization", bearer(owner.accessToken))
          .send({ toMembershipId }),
      ),
    );

    const successCount = results.filter((r) => r.status === 201).length;
    expect(successCount).toBe(1);

    const activeOwners = await prisma.organizationMembership.count({
      where: { organizationId: org.id, role: "OWNER", status: "ACTIVE" },
    });
    expect(activeOwners).toBe(1);
  });

  it("concurrent invitations for the same email: at most one PENDING invitation exists afterward", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-invite-${Date.now()}` });
    const email = `concurrent-invite-${Date.now()}@example.com`;

    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app.getHttpServer())
          .post(`/api/v1/organizations/${org.id}/members/invite`)
          .set("Authorization", bearer(owner.accessToken))
          .send({ email, role: "VIEWER" }),
      ),
    );

    const successCount = results.filter((r) => r.status === 201).length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    const pendingCount = await prisma.organizationInvitation.count({
      where: { organizationId: org.id, email, status: "PENDING" },
    });
    expect(pendingCount).toBe(1);
  });

  it("simultaneous role updates on the same member: the row ends in one of the attempted roles, never a corrupted mix", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-role-${Date.now()}` });
    const target = await createAuthenticatedActor(app);
    await addTestMember(org.id, target.userId, "VIEWER");
    const membership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId: org.id, userId: target.userId },
    });

    await Promise.all([
      request(app.getHttpServer())
        .patch(`/api/v1/organizations/${org.id}/members/${membership.id}/role`)
        .set("Authorization", bearer(owner.accessToken))
        .send({ role: "MANAGER" }),
      request(app.getHttpServer())
        .patch(`/api/v1/organizations/${org.id}/members/${membership.id}/role`)
        .set("Authorization", bearer(owner.accessToken))
        .send({ role: "ANALYST" }),
    ]);

    const finalMembership = await prisma.organizationMembership.findUniqueOrThrow({
      where: { id: membership.id },
    });
    expect(["MANAGER", "ANALYST"]).toContain(finalMembership.role);
  });

  it("a failed transfer (invalid target) leaves no partial state — original Owner is unchanged (transaction rollback)", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-concurrency-rollback-${Date.now()}` });
    const suspendedCandidate = await createAuthenticatedActor(app);
    await addTestMember(org.id, suspendedCandidate.userId, "MANAGER");
    const membership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId: org.id, userId: suspendedCandidate.userId },
    });
    await prisma.organizationMembership.update({ where: { id: membership.id }, data: { status: "SUSPENDED" } });

    const res = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${org.id}/members/transfer-ownership`)
      .set("Authorization", bearer(owner.accessToken))
      .send({ toMembershipId: membership.id });
    expect(res.status).toBe(409);

    const ownerMembership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId: org.id, userId: owner.userId },
    });
    expect(ownerMembership.role).toBe("OWNER");
    expect(ownerMembership.status).toBe("ACTIVE");

    const events = await prisma.organizationMembershipEvent.count({
      where: { organizationId: org.id, action: "OWNERSHIP_TRANSFERRED" },
    });
    expect(events).toBe(0); // rejected before the transaction ever opened — no partial event rows
  });
});
