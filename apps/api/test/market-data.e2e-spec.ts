import { Test } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { createAuthenticatedActor } from "./helpers/auth.helper";
import { grantPlatformRole } from "./helpers/permission.helper";

/**
 * AI-101 Phase 5's "Integration Tests" deliverable — follows this
 * project's existing e2e convention exactly (Test.createTestingModule
 * booting the real AppModule + supertest against real HTTP routes,
 * `health.e2e-spec.ts`'s own pattern), not a new testing approach
 * invented for this module.
 *
 * HONEST LIMITATION, stated plainly: like every other `.e2e-spec.ts`
 * file in this project, this requires a real, migrated, seeded
 * Postgres database (`AppModule`'s real `PrismaClient` connects on
 * boot) and cannot run in this sandbox, which has no live database —
 * the same standing limitation recorded since Module 001. Written and
 * reviewed for correctness against the real endpoint shapes and the
 * real permission grants this phase added to seed.ts; not executed
 * here, and not claimed to have been.
 */
describe("Market Data (e2e)", () => {
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
    it("GET /market-data/exchanges without a token returns 401", () => {
      return request(app.getHttpServer()).get("/api/v1/market-data/exchanges").expect(401);
    });

    it("GET /market-data/exchanges with a SUBSCRIBER-tier token (has market-data.read) returns 200", async () => {
      const actor = await createAuthenticatedActor(app); // defaults to SUBSCRIBER tier
      return request(app.getHttpServer())
        .get("/api/v1/market-data/exchanges")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.success).toBe(true);
          expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    it("GET /market-data/providers with a SUBSCRIBER-tier token (lacks market-data.admin.manage) returns 403", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/market-data/providers")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(403);
    });

    it("GET /market-data/synchronizations/health with an ADMIN-tier token returns 200 with a real health shape", async () => {
      const actor = await createAuthenticatedActor(app);
      await grantPlatformRole(actor.userId, "ADMIN");
      return request(app.getHttpServer())
        .get("/api/v1/market-data/synchronizations/health")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(["ok", "degraded"]).toContain(res.body.data.status);
          expect(Array.isArray(res.body.data.providers)).toBe(true);
          expect(["ok", "error"]).toContain(res.body.data.database);
        });
    });
  });

  describe("request correlation (Phase 5 addition)", () => {
    it("echoes X-Request-Id back on the response, generating one if the caller didn't send it", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.headers["x-request-id"]).toBeDefined();
    });

    it("preserves a caller-supplied X-Request-Id rather than replacing it", async () => {
      const res = await request(app.getHttpServer()).get("/health").set("X-Request-Id", "test-fixed-id-123");
      expect(res.headers["x-request-id"]).toBe("test-fixed-id-123");
    });
  });

  describe("validation", () => {
    it("GET /market-data/candles with neither instrumentId nor exchangeId+symbol returns 400", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/market-data/candles")
        .query({ interval: "ONE_DAY", from: "2026-01-01T00:00:00Z", to: "2026-01-02T00:00:00Z" })
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(400);
    });

    it("GET /market-data/instruments/:id with a non-UUID id returns 400 (ParseUUIDPipe)", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/market-data/instruments/not-a-uuid")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(400);
    });

    it("GET /market-data/instruments/:id with a well-formed but nonexistent UUID returns 404", async () => {
      const actor = await createAuthenticatedActor(app);
      return request(app.getHttpServer())
        .get("/api/v1/market-data/instruments/00000000-0000-0000-0000-000000000000")
        .set("Authorization", `Bearer ${actor.accessToken}`)
        .expect(404);
    });
  });
});
