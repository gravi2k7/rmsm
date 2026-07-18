import { describe, expect, it } from "vitest";
import { computeReadinessStatus } from "../status/readiness";
import { computeLivenessStatus } from "../status/liveness";
import { worstStatus, type HealthCheckResult } from "../types/health.types";

function result(name: string, status: HealthCheckResult["status"]): HealthCheckResult {
  return { name, status, durationMs: 1 };
}

describe("worstStatus", () => {
  it("returns 'down' if any status is down", () => {
    expect(worstStatus(["up", "degraded", "down"])).toBe("down");
  });
  it("returns 'degraded' if the worst is degraded", () => {
    expect(worstStatus(["up", "degraded"])).toBe("degraded");
  });
  it("returns 'up' when everything is up", () => {
    expect(worstStatus(["up", "up"])).toBe("up");
  });
  it("returns 'up' for an empty list", () => {
    expect(worstStatus([])).toBe("up");
  });
});

describe("computeReadinessStatus", () => {
  it("returns 'down' when a critical check is down", () => {
    const results = [result("database", "down"), result("memory", "up")];
    const status = computeReadinessStatus(results, new Set(["database"]));
    expect(status).toBe("down");
  });

  it("does not fail readiness when only a non-critical check is down", () => {
    const results = [result("database", "up"), result("disk", "down")];
    const status = computeReadinessStatus(results, new Set(["database"]));
    expect(status).toBe("degraded"); // visible, but not a readiness failure
  });

  it("returns 'degraded' when a critical check is merely degraded, not down", () => {
    const results = [result("database", "degraded")];
    const status = computeReadinessStatus(results, new Set(["database"]));
    expect(status).toBe("degraded");
  });

  it("returns 'up' when every check is up", () => {
    const results = [result("database", "up"), result("memory", "up")];
    const status = computeReadinessStatus(results, new Set(["database"]));
    expect(status).toBe("up");
  });

  it("treats an unlisted (non-critical) check's down status as degraded, not down", () => {
    const results = [result("disk", "down")];
    const status = computeReadinessStatus(results, new Set());
    expect(status).toBe("degraded");
  });
});

describe("computeLivenessStatus", () => {
  it("is always 'up' — liveness never depends on check results", () => {
    expect(computeLivenessStatus()).toBe("up");
  });
});
