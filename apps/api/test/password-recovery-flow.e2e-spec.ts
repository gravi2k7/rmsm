import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createTestUser } from "./factories/user.factory";
import { createTestPasswordReset } from "./factories/password-reset.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * WM-020F Scenario 3 (Forgot Password) + Scenario 4 (Reset Password).
 * `forgotPassword()`'s own raw token is unrecoverable by design (see the
 * pattern already established for email verification/invitations) —
 * `createTestPasswordReset()` issues a known-token row for the reset-flow
 * assertions instead of trying to recover it from a real
 * `/auth/forgot-password` call.
 */
describe("Password Recovery Flow (e2e)", () => {
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

  describe("Scenario 3 — forgot password, no email enumeration", () => {
    it("returns an identical 200 response for a real account and for a non-existent one", async () => {
      const { email } = await createTestUser();

      const realRes = await request(app.getHttpServer()).post("/api/v1/auth/forgot-password").send({ email });
      const fakeRes = await request(app.getHttpServer())
        .post("/api/v1/auth/forgot-password")
        .send({ email: `test-user-does-not-exist-${Date.now()}@example.com` });

      expect(realRes.status).toBe(200);
      expect(fakeRes.status).toBe(200);
      expect(realRes.body).toEqual(fakeRes.body);
    });

    it("actually creates a PasswordReset row for the real account (behind the identical response)", async () => {
      const { user, email } = await createTestUser();
      await request(app.getHttpServer()).post("/api/v1/auth/forgot-password").send({ email });

      const reset = await prisma.passwordReset.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
      expect(reset).toBeTruthy();
      expect(reset?.usedAt).toBeNull();
    });
  });

  describe("Scenario 4 — reset password", () => {
    it("resets the password with a valid token, then allows login with the new password (not the old one)", async () => {
      const { user, email, password: oldPassword } = await createTestUser();
      const { rawToken } = await createTestPasswordReset(user.id);
      const newPassword = "N3wStr0ng!Passw0rd456";

      const resetRes = await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, newPassword });
      expect(resetRes.status).toBe(200);

      const oldLoginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: oldPassword });
      expect(oldLoginRes.status).toBe(401);

      const newLoginRes = await request(app.getHttpServer())
        .post("/api/v1/auth/login")
        .send({ email, password: newPassword });
      expect(newLoginRes.status).toBe(200);
    });

    it("revokes all existing sessions when the password is reset (session invalidation)", async () => {
      const { user, email, password: oldPassword } = await createTestUser();
      const loginRes = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password: oldPassword });
      const { refreshToken } = loginRes.body.tokens;

      const { rawToken } = await createTestPasswordReset(user.id);
      await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, newPassword: "AnotherStr0ng!Pass789" });

      const refreshRes = await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it("rejects an expired reset token", async () => {
      const { user } = await createTestUser();
      const { rawToken } = await createTestPasswordReset(user.id, { expiresAt: new Date(Date.now() - 60_000) });

      const res = await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, newPassword: "SomeStr0ng!Pass000" });
      expect(res.status).toBe(400);
    });

    it("rejects reusing an already-used reset token (single-use)", async () => {
      const { user } = await createTestUser();
      const { rawToken } = await createTestPasswordReset(user.id);

      const firstRes = await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, newPassword: "FirstStr0ng!Pass111" });
      expect(firstRes.status).toBe(200);

      const secondRes = await request(app.getHttpServer())
        .post("/api/v1/auth/reset-password")
        .send({ token: rawToken, newPassword: "SecondStr0ng!Pass222" });
      expect(secondRes.status).toBe(400);
    });
  });
});
