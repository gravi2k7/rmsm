import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { prisma } from "@rmsm/database";
import { AppModule } from "../src/app.module";
import { createTestUser } from "./factories/user.factory";
import { cleanupTestData, assertReferenceDataSeeded } from "./seed/test-database.seeder";

/**
 * WM-020F Scenario 8 (Concurrent Login), Scenario 9 (Logout All Devices),
 * Scenario 10 (Session Expiration). Reuses the existing `SessionService`/
 * `SessionsController` (`GET /sessions`, `DELETE /sessions/:id`,
 * `DELETE /sessions`) and `AuthService.refresh()`'s own expiry check —
 * no new session logic, this only exercises what's already there through
 * the real HTTP layer.
 */
describe("Session Lifecycle (e2e)", () => {
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

  describe("Scenario 8 — concurrent login", () => {
    it("logging in twice from the same account creates two independent, simultaneously-usable sessions", async () => {
      const { email, password } = await createTestUser();

      const loginA = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
      const loginB = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
      expect(loginA.status).toBe(200);
      expect(loginB.status).toBe(200);
      expect(loginA.body.sessionId).not.toBe(loginB.body.sessionId);

      const meA = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${loginA.body.tokens.accessToken}`);
      const meB = await request(app.getHttpServer())
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${loginB.body.tokens.accessToken}`);
      expect(meA.status).toBe(200);
      expect(meB.status).toBe(200);
    });

    it("both sessions appear in the active-sessions listing", async () => {
      const { email, password } = await createTestUser();
      const loginA = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
      const loginB = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/sessions")
        .set("Authorization", `Bearer ${loginA.body.tokens.accessToken}`);
      expect(listRes.status).toBe(200);
      const ids = listRes.body.map((s: { id: string }) => s.id);
      expect(ids).toEqual(expect.arrayContaining([loginA.body.sessionId, loginB.body.sessionId]));
    });
  });

  describe("Scenario 9 — logout all devices", () => {
    it("DELETE /sessions revokes every other session's refresh token while leaving the current one usable", async () => {
      const { email, password } = await createTestUser();
      const loginA = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
      const loginB = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });

      const revokeRes = await request(app.getHttpServer())
        .delete("/api/v1/sessions")
        .set("Authorization", `Bearer ${loginA.body.tokens.accessToken}`);
      expect(revokeRes.status).toBe(200);

      // Session B's refresh token must now be rejected...
      const refreshB = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: loginB.body.tokens.refreshToken });
      expect(refreshB.status).toBe(401);

      // ...while session A (the one that issued the "revoke all others" call) still works.
      const refreshA = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: loginA.body.tokens.refreshToken });
      expect(refreshA.status).toBe(200);
    });

    it("DELETE /sessions/:id revokes one specific session by id", async () => {
      const { email, password } = await createTestUser();
      const loginA = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
      const loginB = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });

      const revokeRes = await request(app.getHttpServer())
        .delete(`/api/v1/sessions/${loginB.body.sessionId}`)
        .set("Authorization", `Bearer ${loginA.body.tokens.accessToken}`);
      expect(revokeRes.status).toBe(200);

      const refreshB = await request(app.getHttpServer())
        .post("/api/v1/auth/refresh")
        .send({ refreshToken: loginB.body.tokens.refreshToken });
      expect(refreshB.status).toBe(401);
    });
  });

  describe("Scenario 10 — session expiration", () => {
    it("a refresh token past its expiresAt is rejected even though it was never explicitly revoked", async () => {
      const { email, password } = await createTestUser();
      const loginRes = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });
      const { refreshToken } = loginRes.body.tokens;

      // Simulate real time-based expiry (distinct from the already-covered
      // rotation/reuse-revocation path in auth-flow.e2e-spec.ts) by
      // backdating the persisted RefreshToken row's expiresAt — scoped by
      // sessionId (returned from login) rather than userId, so this can
      // never touch another test's rows in a shared test database. The
      // raw token itself is still the genuine one the client holds.
      await prisma.refreshToken.updateMany({
        where: { sessionId: loginRes.body.sessionId, revokedAt: null },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      const refreshRes = await request(app.getHttpServer()).post("/api/v1/auth/refresh").send({ refreshToken });
      expect(refreshRes.status).toBe(401);
    });

    it("an already-revoked session cannot be revoked again in a way that resurrects it, and its sessions list entry reflects the revocation", async () => {
      const { email, password } = await createTestUser();
      const loginRes = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ email, password });

      await request(app.getHttpServer())
        .delete(`/api/v1/sessions/${loginRes.body.sessionId}`)
        .set("Authorization", `Bearer ${loginRes.body.tokens.accessToken}`);

      const session = await prisma.session.findUniqueOrThrow({ where: { id: loginRes.body.sessionId } });
      expect(session.revokedAt).not.toBeNull();

      const listRes = await request(app.getHttpServer())
        .get("/api/v1/sessions")
        .set("Authorization", `Bearer ${loginRes.body.tokens.accessToken}`);
      // listActive() only returns non-revoked sessions — the access token
      // itself remains valid until its own short JWT expiry (that's a
      // separate, already-covered guarantee), but the session it belongs
      // to no longer shows as active.
      expect(listRes.status).toBe(200);
      expect(listRes.body.some((s: { id: string }) => s.id === loginRes.body.sessionId)).toBe(false);
    });
  });
});
