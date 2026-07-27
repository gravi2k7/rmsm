import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createTestEmailVerification } from "./factories/email-verification.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * WM-020F Scenario 1 (Retail Registration) + Scenario 11 (Duplicate
 * Registration) — the full Path A chain from WM-020F's own spec:
 * Register -> Verify Email -> Create Personal Organization -> Create
 * Main Workspace -> Assign Owner Role -> (ready for) Dashboard, exercised
 * through the real `/auth/register` + `/onboarding/verify-email`
 * endpoints (not the underlying services directly — this is the one
 * genuinely new cross-module orchestration WM-020D/E built, so it's the
 * one that most needs a real HTTP-level test).
 *
 * `/auth/register`'s own auto-issued verification token is unrecoverable
 * by design (only its hash is stored — see auth-flow.e2e-spec.ts's same
 * note), so `createTestEmailVerification()` issues a second, known-token
 * verification row for the same user, exactly like
 * membership-lifecycle.e2e-spec.ts does for invitation accept.
 */
describe("Onboarding Flow (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    await assertReferenceDataSeeded();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  const email = `test-user-onboarding-${Date.now()}@example.com`;
  const password = "Str0ng!Passw0rd123";
  const companyName = `Test Org Onboarding ${Date.now()}`;

  it("registers a new retail account with a company name", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password, firstName: "Jane", lastName: "Trader", companyName });
    expect(res.status).toBe(201);
  });

  it("rejects registering the same email a second time (duplicate registration, Scenario 11)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password, firstName: "Jane", lastName: "Trader" });
    expect(res.status).toBe(400);
    expect(res.body?.error?.code ?? res.body?.code).toBe("EMAIL_ALREADY_EXISTS");
  });

  it("does not create a second User row for the rejected duplicate registration", async () => {
    const users = await prisma.user.findMany({ where: { email } });
    expect(users).toHaveLength(1);
  });

  let userId: string;
  let organizationId: string;

  it("completes onboarding: verifies email, auto-creates the personal organization, and assigns Owner (Scenario 1)", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    userId = user.id;
    const { rawToken } = await createTestEmailVerification(userId);

    const res = await request(app.getHttpServer())
      .post("/api/v1/onboarding/verify-email")
      .send({ token: rawToken, companyName });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe("OWNER");
    expect(res.body.source).toBe("created");
    expect(res.body.organizationId).toBeTruthy();
    organizationId = res.body.organizationId;
  });

  it("the account is now ACTIVE and email-verified", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.status).toBe("ACTIVE");
    expect(user.emailVerifiedAt).not.toBeNull();
  });

  it("created exactly one organization with exactly one OWNER membership — no orphaned or duplicate resources", async () => {
    const memberships = await prisma.organizationMembership.findMany({ where: { userId } });
    expect(memberships).toHaveLength(1);
    // `memberships[0]` is typed as possibly `undefined` under
    // noUncheckedIndexedAccess even after the length assertion above (TS
    // can't correlate the two) — destructure once and use optional
    // chaining rather than a non-null assertion or weakening tsconfig.
    const [membership] = memberships;
    expect(membership?.organizationId).toBe(organizationId);
    expect(membership?.role).toBe("OWNER");
    expect(membership?.status).toBe("ACTIVE");

    const org = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    expect(org.createdById).toBe(userId);
    expect(org.slug).toContain("test-org-");
  });

  it("recorded organization.created and user.email_verified audit log entries", async () => {
    const orgCreated = await prisma.auditLog.findFirst({
      where: { action: "organization.created", entityId: organizationId },
    });
    expect(orgCreated).toBeTruthy();

    const emailVerified = await prisma.auditLog.findFirst({
      where: { action: "user.email_verified", userId },
    });
    expect(emailVerified).toBeTruthy();
  });

  it("re-verifying (e.g. a double-submitted request) does not create a second organization — duplicate organization prevention", async () => {
    const { rawToken } = await createTestEmailVerification(userId);

    const res = await request(app.getHttpServer())
      .post("/api/v1/onboarding/verify-email")
      .send({ token: rawToken });

    expect(res.status).toBe(201);
    expect(res.body.source).toBe("existing_membership");
    expect(res.body.organizationId).toBe(organizationId);

    const memberships = await prisma.organizationMembership.findMany({ where: { userId } });
    expect(memberships).toHaveLength(1);
    const orgs = await prisma.organization.findMany({ where: { createdById: userId } });
    expect(orgs).toHaveLength(1);
  });

  it("logs in with the new account and reaches a protected route (dashboard-equivalent readiness)", async () => {
    const loginRes = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(loginRes.status).toBe(200);

    const meRes = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.tokens.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
  });
});
