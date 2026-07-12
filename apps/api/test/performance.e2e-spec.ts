import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor, bearer, TestActor } from "./helpers/auth.helper";
import { createTestOrganization, addTestMember } from "./factories/organization.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * Performance — smoke-level latency assertions on a local/dev database,
 * not a load test. Thresholds are deliberately generous (seconds, not
 * milliseconds) since this runs against a single local Postgres instance
 * with no connection pooling tuning — the goal is catching an accidental
 * N+1 query or missing index, not asserting production SLAs. A real
 * performance/load-testing pass (k6, Artillery, etc. against a
 * production-like environment) is out of scope for an integration test
 * suite and would belong in a separate CI job.
 */
describe("Performance smoke tests (e2e)", () => {
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

  async function timed<T>(label: string, fn: () => Promise<T>, maxMs: number): Promise<T> {
    const start = Date.now();
    const result = await fn();
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(maxMs);
    return result;
  }

  it("creates an organization within a generous latency bound", async () => {
    await timed(
      "create organization",
      () =>
        request(app.getHttpServer())
          .post("/api/v1/organizations")
          .set("Authorization", bearer(owner.accessToken))
          .send({ name: "Perf Test Org", slug: `test-org-perf-create-${Date.now()}` }),
      2000,
    );
  });

  it("invites a member within a generous latency bound", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-perf-invite-${Date.now()}` });
    await timed(
      "invite member",
      () =>
        request(app.getHttpServer())
          .post(`/api/v1/organizations/${org.id}/members/invite`)
          .set("Authorization", bearer(owner.accessToken))
          .send({ email: `perf-invite-${Date.now()}@example.com`, role: "VIEWER" }),
      2000,
    );
  });

  it("transfers ownership within a generous latency bound", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-perf-transfer-${Date.now()}` });
    const candidate = await createAuthenticatedActor(app);
    await addTestMember(org.id, candidate.userId, "MANAGER");
    const { prisma } = await import("@rmsm/database");
    const membership = await prisma.organizationMembership.findFirstOrThrow({
      where: { organizationId: org.id, userId: candidate.userId },
    });

    await timed(
      "transfer ownership",
      () =>
        request(app.getHttpServer())
          .post(`/api/v1/organizations/${org.id}/members/transfer-ownership`)
          .set("Authorization", bearer(owner.accessToken))
          .send({ toMembershipId: membership.id }),
      3000, // includes the in-transaction re-verification read
    );
  });

  it("lists members within a generous latency bound, independent of member count", async () => {
    const org = await createTestOrganization(owner.userId, { slug: `test-org-perf-list-${Date.now()}` });
    for (let i = 0; i < 20; i++) {
      const member = await createAuthenticatedActor(app);
      await addTestMember(org.id, member.userId, "VIEWER");
    }

    await timed(
      "list members",
      () =>
        request(app.getHttpServer())
          .get(`/api/v1/organizations/${org.id}/members`)
          .set("Authorization", bearer(owner.accessToken)),
      2000,
    );
  });

  it("searches organizations within a generous latency bound", async () => {
    await timed(
      "search organizations",
      () =>
        request(app.getHttpServer())
          .get("/api/v1/organizations")
          .query({ search: "Perf" })
          .set("Authorization", bearer(owner.accessToken)),
      2000,
    );
  });
});
