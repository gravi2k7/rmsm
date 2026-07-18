import { describe, expect, it } from "vitest";
import { HealthController } from "../health/health.controller";
import { HealthService } from "../health/health.service";
import type { HealthCheck } from "../types/health.types";

function fakeCheck(name: string, status: "up" | "degraded" | "down", critical = true): HealthCheck {
  return { name, critical, check: async () => ({ name, status, durationMs: 1 }) };
}

describe("HealthController.getHealth", () => {
  it("returns 200 with system info included when healthy", async () => {
    const service = new HealthService({ checks: [fakeCheck("a", "up")] });
    const { statusCode, body } = await new HealthController(service).getHealth();

    expect(statusCode).toBe(200);
    expect(body.status).toBe("up");
    expect(body.system).toBeDefined();
    expect(body.system.nodeVersion).toBe(process.version);
  });

  it("returns 503 when a check is down", async () => {
    const service = new HealthService({ checks: [fakeCheck("a", "down")] });
    const { statusCode } = await new HealthController(service).getHealth();
    expect(statusCode).toBe(503);
  });

  it("returns 200 (not 503) when merely degraded", async () => {
    const service = new HealthService({ checks: [fakeCheck("a", "degraded", false)] });
    const { statusCode, body } = await new HealthController(service).getHealth();
    expect(statusCode).toBe(200);
    expect(body.status).toBe("degraded");
  });
});

describe("HealthController.getLiveness", () => {
  it("always returns 200 with status up", () => {
    const service = new HealthService({ checks: [fakeCheck("a", "down")] });
    const { statusCode, body } = new HealthController(service).getLiveness();
    expect(statusCode).toBe(200);
    expect(body.status).toBe("up");
  });
});

describe("HealthController.getReadiness", () => {
  it("returns 503 when a critical check is down", async () => {
    const service = new HealthService({ checks: [fakeCheck("database", "down", true)] });
    const { statusCode } = await new HealthController(service).getReadiness();
    expect(statusCode).toBe(503);
  });

  it("returns 200 when only a non-critical check is down", async () => {
    const service = new HealthService({ checks: [fakeCheck("disk", "down", false)] });
    const { statusCode, body } = await new HealthController(service).getReadiness();
    expect(statusCode).toBe(200);
    expect(body.status).toBe("degraded");
  });
});
