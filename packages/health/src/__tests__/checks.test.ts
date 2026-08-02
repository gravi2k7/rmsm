import { describe, expect, it, vi } from "vitest";
import { DatabaseHealthCheck } from "../checks/database.check";
import { MemoryHealthCheck } from "../checks/memory.check";
import { DiskHealthCheck } from "../checks/disk.check";
import { UptimeHealthCheck } from "../checks/uptime.check";
import type { DatabasePinger } from "../types/health.types";

describe("DatabaseHealthCheck", () => {
  it("reports 'up' when the pinger resolves", async () => {
    const pinger: DatabasePinger = { ping: async () => undefined };
    const result = await new DatabaseHealthCheck(pinger).check();
    expect(result.status).toBe("up");
    expect(result.name).toBe("database");
  });

  it("reports 'down' with the error message when the pinger rejects", async () => {
    const pinger: DatabasePinger = {
      ping: async () => {
        throw new Error("connection refused");
      },
    };
    const result = await new DatabaseHealthCheck(pinger).check();
    expect(result.status).toBe("down");
    expect(result.message).toBe("connection refused");
  });

  it("is critical by default", () => {
    const check = new DatabaseHealthCheck({ ping: async () => undefined });
    expect(check.critical).toBe(true);
  });

  it("can be constructed as non-critical", () => {
    const check = new DatabaseHealthCheck({ ping: async () => undefined }, { critical: false });
    expect(check.critical).toBe(false);
  });

  it("handles a non-Error rejection without throwing", async () => {
    const pinger: DatabasePinger = {
      ping: async () => {
        // eslint-disable-next-line @typescript-eslint/no-throw-literal -- intentionally testing the non-Error path
        throw "raw string failure";
      },
    };
    const result = await new DatabaseHealthCheck(pinger).check();
    expect(result.status).toBe("down");
    expect(result.message).toBe("raw string failure");
  });
});

describe("MemoryHealthCheck", () => {
  it("reports 'up' with memory metadata when heap usage is below the threshold", async () => {
  const spy = vi.spyOn(process, "memoryUsage").mockReturnValue({
    rss: 100,
    heapTotal: 100,
    heapUsed: 40,
    external: 0,
    arrayBuffers: 0,
  });

  try {
    const result = await new MemoryHealthCheck().check();

    expect(result.name).toBe("memory");
    expect(result.status).toBe("up");
    expect(typeof result.meta?.heapUsedRatio).toBe("number");
  } finally {
    spy.mockRestore();
  }
});

  it("reports 'degraded' when heap usage exceeds the configured threshold", async () => {
    const spy = vi.spyOn(process, "memoryUsage").mockReturnValue({
      rss: 100,
      heapTotal: 100,
      heapUsed: 95,
      external: 0,
      arrayBuffers: 0,
    });
    const result = await new MemoryHealthCheck({ degradedThreshold: 0.9 }).check();
    expect(result.status).toBe("degraded");
    expect(result.message).toContain("95");
    spy.mockRestore();
  });

  it("is never critical", () => {
    expect(new MemoryHealthCheck().critical).toBe(false);
  });
});

describe("DiskHealthCheck", () => {
  it("reports 'up' with real free-space metadata for the current directory", async () => {
    const result = await new DiskHealthCheck().check();
    expect(result.name).toBe("disk");
    expect(["up", "degraded"]).toContain(result.status); // real filesystem — don't assume free space
    expect(typeof result.meta?.freeRatio).toBe("number");
  });

  it("reports 'down' when the path doesn't exist", async () => {
    const result = await new DiskHealthCheck({ path: "/this/path/does/not/exist/hopefully" }).check();
    expect(result.status).toBe("down");
    expect(result.message).toBeTruthy();
  });

  it("is never critical", () => {
    expect(new DiskHealthCheck().critical).toBe(false);
  });
});

describe("UptimeHealthCheck", () => {
  it("always reports 'up' with a non-negative uptime", async () => {
    const result = await new UptimeHealthCheck().check();
    expect(result.status).toBe("up");
    expect(result.meta?.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });

  it("is never critical", () => {
    expect(new UptimeHealthCheck().critical).toBe(false);
  });
});
