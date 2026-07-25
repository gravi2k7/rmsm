import { describe, it, expect, beforeEach } from "vitest";
import { MetricsService } from "../services/metrics.service";
import { makeMetricsRepository } from "./fakes";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";

describe("MetricsService", () => {
  let metricsRepository: MetricsRepository;
  let service: MetricsService;

  beforeEach(() => {
    metricsRepository = makeMetricsRepository();
    service = new MetricsService(metricsRepository);
  });

  it("records latency and computes durationMs", async () => {
    const started = new Date("2026-01-01T00:00:00.000Z");
    const completed = new Date("2026-01-01T00:00:00.750Z");

    const metric = await service.recordLatency("req-1", started, completed);

    expect(metric.durationMs).toBe(750);
    expect(await service.getLatencies("req-1")).toEqual([metric]);
  });

  it("records a retry", async () => {
    await service.recordRetry({ requestId: "req-1", attempt: 1, reason: "rate limited", occurredAt: new Date() });
    // no dedicated getter is exposed for retries beyond what the repository stores directly
    await expect(service.recordRetry({ requestId: "req-1", attempt: 2, reason: "timeout", occurredAt: new Date() })).resolves.toBeUndefined();
  });

  it("records a failure", async () => {
    await expect(
      service.recordFailure({ requestId: "req-1", errorMessage: "boom", occurredAt: new Date() }),
    ).resolves.toBeUndefined();
  });

  it("scopes getLatencies to the given requestId", async () => {
    await service.recordLatency("req-1", new Date(0), new Date(100));
    await service.recordLatency("req-2", new Date(0), new Date(200));

    const latencies = await service.getLatencies("req-1");
    expect(latencies).toHaveLength(1);
    expect(latencies[0]?.durationMs).toBe(100);
  });
});
