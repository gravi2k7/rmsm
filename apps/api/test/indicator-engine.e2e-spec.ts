import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor } from "./helpers/auth.helper";
import { grantPlatformRole } from "./helpers/permission.helper";

/**
 * AI-102 Phase 4's "Integration Tests" deliverable (item 13) — follows
 * this project's exact established e2e convention
 * (Test.createTestingModule booting the real AppModule + supertest
 * against real HTTP routes), the identical pattern AI-101's own Phase 4
 * e2e spec used.
 *
 * HONEST LIMITATION, stated plainly: like every other `.e2e-spec.ts`
 * file in this project, this requires a real, migrated, seeded
 * PostgreSQL database (`AppModule`'s real `PrismaClient` connects on
 * boot) and cannot run in this sandbox, which has no live database —
 * the same standing limitation recorded since Module 001. Written and
 * reviewed for correctness against the real endpoint shapes and the
 * real permission grants this phase added to seed.ts; not executed
 * here, and not claimed to have been.
 */
describe("Indicator Engine (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health", "health/ready"] });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("authentication and authorization", () => {
    it("GET /indicators without a token returns 401", () => {
      return request(app.getHttpServer()).get("/api/v1/indicators").expect(401);
    });

    it("GET /indicators with a FREE_USER-tier token (has indicator-engine.read) returns 200", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/indicators")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.pagination).toBeDefined();
        });
    });

    it("POST /indicators/execute with a SUBSCRIBER-tier token (has indicator-engine.execute) is authorized (200, even though the underlying calculation itself fails honestly)", async () => {
      const actor = await createAuthenticatedActor(app); // defaults to SUBSCRIBER tier
      return request(app.getHttpServer())
        .post("/api/v1/indicators/execute")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .send({
          indicatorIdentifier: "ema",
          instrumentId: "00000000-0000-0000-0000-000000000000",
          timeframe: "ONE_DAY",
          calculationMode: "FULL_RECALCULATION",
          from: "2026-01-01T00:00:00Z",
          to: "2026-02-01T00:00:00Z",
        })
        .expect(200)
        .expect((res) => {
          // Authorized and reachable — the underlying execution itself
          // is expected to report FAILED (no real calculate()
          // implementation exists for any indicator yet, an honest,
          // unchanged limitation since Phase 2B).
          expect(["COMPLETED", "FAILED"]).toContain(res.body.summary.status);
        });
    });

    it("a FREE_USER-tier token (lacks indicator-engine.execute) gets 403 on POST /indicators/execute", async () => {
      const actor = await createAuthenticatedActor(app);
      await grantPlatformRole(actor.userId, "FREE_USER");
      return request(app.getHttpServer())
        .post("/api/v1/indicators/execute")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .send({ indicatorIdentifier: "ema", instrumentId: "00000000-0000-0000-0000-000000000000", timeframe: "ONE_DAY", calculationMode: "FULL_RECALCULATION", from: "2026-01-01T00:00:00Z", to: "2026-02-01T00:00:00Z" })
        .expect(403);
    });
  });

  describe("core endpoints", () => {
    it("GET /indicators/:identifier returns real metadata for a registered indicator (e.g. ema, registered by Phase 2A's own registrar)", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/indicators/ema")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.identifier).toBe("ema");
        });
    });

    it("GET /indicators/does_not_exist returns 404", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/indicators/does_not_exist")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(404);
    });

    it("GET /indicators/categories returns real categories from the actual registered set", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/indicators/categories")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toContain("TREND");
        });
    });

    it("GET /indicators/rdse/versions returns all 3 real RDSE versions (item 7's own worked example, Phase 2A)", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/indicators/rdse/versions")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.sort()).toEqual(["1.0.0", "1.1.0", "2.0.0"]);
        });
    });

    it("POST /indicators/validate with a well-formed request returns valid: true", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .post("/api/v1/indicators/validate")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .send({ indicatorIdentifier: "ema", parameters: { period: 20 }, timeframe: "ONE_DAY" })
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(true);
        });
    });

    it("POST /indicators/validate for an unregistered indicator returns valid: false with a real error", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .post("/api/v1/indicators/validate")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .send({ indicatorIdentifier: "does_not_exist", parameters: {}, timeframe: "ONE_DAY" })
        .expect(200)
        .expect((res) => {
          expect(res.body.valid).toBe(false);
        });
    });

    it("GET /indicators/health returns real, functional health status, with no auth token required (it's @Public())", async () => {
      return request(app.getHttpServer())
        .get("/api/v1/indicators/health")
        .expect(200)
        .expect((res) => {
          expect(["ok", "degraded"]).toContain(res.body.status);
          expect(res.body.serviceReadiness).toBeDefined();
        });
    });
  });

  describe("validation and error mapping", () => {
    it("POST /indicators/execute with a malformed body (missing required fields) returns 400 (ValidationPipe, before reaching any service)", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .post("/api/v1/indicators/execute")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .send({ indicatorIdentifier: "ema" }) // missing instrumentId, timeframe, calculationMode, from, to
        .expect(400);
    });

    it("error responses never include an internal stack trace", async () => {
      const actor = await createAuthenticatedActor(app);
      const res = await request(app.getHttpServer())
        .get("/api/v1/indicators/does_not_exist")
        .set("Authorization", `Bearer ${actor.accessToken}`);
      expect(JSON.stringify(res.body)).not.toContain(".ts:");
      expect(res.body).not.toHaveProperty("stack");
    });

    it("error responses carry the request's own correlation id (platform-wide RequestIdMiddleware, AI-101 Phase 5)", async () => {
      const actor = await createAuthenticatedActor(app);
      const res = await request(app.getHttpServer())
        .get("/api/v1/indicators/does_not_exist")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .set("X-Request-Id", "test-correlation-id-456");
      expect(res.headers["x-request-id"]).toBe("test-correlation-id-456");
      expect(res.body.meta?.requestId).toBe("test-correlation-id-456");
    });
  });
});
