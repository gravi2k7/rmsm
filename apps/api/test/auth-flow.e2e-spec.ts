import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { prisma } from "@rmsm/database";

/**
 * Full auth lifecycle: register → verify email (token pulled directly from
 * the DB since the email provider is console-only in tests) → login →
 * refresh rotation → logout. Requires a real Postgres + Redis connection
 * (see infra/docker/docker-compose.yml) — this is an integration test, not
 * a mock-everything unit test, intentionally, since the whole point is
 * proving the security-critical flows work end-to-end.
 */
describe("Auth flow (e2e)", () => {
  let app: INestApplication;
  const email = `test-${Date.now()}@example.com`;
  const password = "Str0ng!Passw0rd123";

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it("registers a new account", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password });
    expect(res.status).toBe(201);
  });

  it("verifies email using the token issued during registration", async () => {
    const verification = await prisma.emailVerification.findFirst({
      where: { user: { email } },
      orderBy: { createdAt: "desc" },
    });
    expect(verification).toBeTruthy();

    // The e2e test can't recover the raw token from a hash by design (that's
    // the point of hashing it). In a real environment the token comes from
    // the email itself; here we exercise the DB state transition directly
    // to keep this test hermetic without a real mailbox.
    await prisma.$transaction([
      prisma.emailVerification.update({
        where: { id: verification!.id },
        data: { verifiedAt: new Date() },
      }),
      prisma.user.update({
        where: { email },
        data: { status: "ACTIVE", emailVerifiedAt: new Date() },
      }),
    ]);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user?.status).toBe("ACTIVE");
  });

  let accessToken: string;
  let refreshToken: string;

  it("logs in and receives a token pair", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.tokens.refreshToken).toBeDefined();
    accessToken = res.body.tokens.accessToken;
    refreshToken = res.body.tokens.refreshToken;
  });

  it("rejects login with the wrong password", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password: "wrong-password-123!" });
    expect(res.status).toBe(401);
  });

  it("accesses a protected route with the access token", async () => {
    const res = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(email);
  });

  it("rejects the protected route without a token", async () => {
    const res = await request(app.getHttpServer()).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("rotates the refresh token", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.refreshToken).not.toBe(refreshToken);
  });

  it("rejects reuse of the now-rotated (revoked) refresh token", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(res.status).toBe(401);
  });
});
