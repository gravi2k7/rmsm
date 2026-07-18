import { describe, expect, it } from "vitest";
import { HealthService } from "../health/health.service";
import type { HealthCheck, HealthCheckResult } from "../types/health.types";

function fakeCheck(name: string, status: HealthCheckResult["status"], critical = true): HealthCheck {
  return { name, critical, check: async () => ({ name, status, durationMs: 1 }) };
}

function throwingCheck(name: string): HealthCheck {
  return {
    name,
    critical: true,
    check: async () => {
      throw new Error(`${name} exploded`);
    },
  };
}

describe("HealthService.checkAll", () => {
  it("aggregates to 'up' when every check is up", async () => {
    const service = new HealthService({ checks: [fakeCheck("a", "up"), fakeCheck("b", "up")] });
    const report = await service.checkAll();
    expect(report.status).toBe("up");
    expect(report.checks).toHaveLength(2);
  });

  it("aggregates to 'down' if any check (critical or not) is down", async () => {
    const service = new HealthService({ checks: [fakeCheck("a", "up"), fakeCheck("b", "down", false)] });
    const report = await service.checkAll();
    expect(report.status).toBe("down");
  });

  it("isolates a throwing check — other checks still complete and it reports down, not a crash", async () => {
    const service = new HealthService({ checks: [fakeCheck("healthy", "up"), throwingCheck("broken")] });
    const report = await service.checkAll();

    expect(report.status).toBe("down");
    expect(report.checks.find((c) => c.name === "healthy")?.status).toBe("up");
    expect(report.checks.find((c) => c.name === "broken")).toMatchObject({ status: "down", message: "broken exploded" });
  });

  it("includes an ISO timestamp", async () => {
    const service = new HealthService({ checks: [] });
    const report = await service.checkAll();
    expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("HealthService.checkReadiness", () => {
  it("fails readiness when a critical check is down", async () => {
    const service = new HealthService({ checks: [fakeCheck("database", "down", true)] });
    const report = await service.checkReadiness();
    expect(report.status).toBe("down");
  });

  it("does not fail readiness when only a non-critical check is down", async () => {
    const service = new HealthService({ checks: [fakeCheck("disk", "down", false)] });
    const report = await service.checkReadiness();
    expect(report.status).toBe("degraded");
  });

  it("treats a check with no explicit critical flag as critical by default", async () => {
    const check: HealthCheck = { name: "database", check: async () => ({ name: "database", status: "down", durationMs: 1 }) };
    const service = new HealthService({ checks: [check] });
    const report = await service.checkReadiness();
    expect(report.status).toBe("down");
  });
});

describe("HealthService.checkLiveness", () => {
  it("always reports 'up' without running any checks", () => {
    let ran = false;
    const check: HealthCheck = {
      name: "should-not-run",
      check: async () => {
        ran = true;
        return { name: "should-not-run", status: "down", durationMs: 1 };
      },
    };
    const service = new HealthService({ checks: [check] });

    const report = service.checkLiveness();

    expect(report.status).toBe("up");
    expect(report.checks).toHaveLength(0);
    expect(ran).toBe(false);
  });
});

describe("HealthService.getSystemInfo", () => {
  it("returns real, sane system metadata", () => {
    const service = new HealthService({ checks: [], appVersion: "1.2.3" });
    const info = service.getSystemInfo();

    expect(info.appVersion).toBe("1.2.3");
    expect(info.nodeVersion).toBe(process.version);
    expect(info.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(info.memory.heapUsedRatio).toBeGreaterThan(0);
    expect(info.memory.heapUsedRatio).toBeLessThanOrEqual(1);
  });

  it("defaults appVersion from npm_package_version when not provided", () => {
    const original = process.env.npm_package_version;
    process.env.npm_package_version = "9.9.9";

    const service = new HealthService({ checks: [] });
    expect(service.getSystemInfo().appVersion).toBe("9.9.9");

    if (original === undefined) delete process.env.npm_package_version;
    else process.env.npm_package_version = original;
  });
});
