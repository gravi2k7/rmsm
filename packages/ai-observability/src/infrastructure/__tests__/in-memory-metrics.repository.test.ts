import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMetricsRepository } from "../in-memory-metrics.repository";

describe("InMemoryMetricsRepository", () => {
  let repository: InMemoryMetricsRepository;

  beforeEach(() => {
    repository = new InMemoryMetricsRepository();
  });

  it("records and finds latencies scoped by requestId", async () => {
    await repository.recordLatency({ requestId: "req-1", startedAt: new Date(0), completedAt: new Date(100), durationMs: 100 });
    await repository.recordLatency({ requestId: "req-2", startedAt: new Date(0), completedAt: new Date(200), durationMs: 200 });

    const latencies = await repository.findLatenciesByRequestId("req-1");
    expect(latencies).toHaveLength(1);
    expect(latencies[0]?.durationMs).toBe(100);
  });

  it("accepts retry, failure, usage, and cost records without error", async () => {
    await expect(repository.recordRetry({ requestId: "req-1", attempt: 1, reason: "x", occurredAt: new Date() })).resolves.toBeUndefined();
    await expect(repository.recordFailure({ requestId: "req-1", errorMessage: "x", occurredAt: new Date() })).resolves.toBeUndefined();
    await expect(repository.recordUsage("req-1", { promptTokens: 1, completionTokens: 1, totalTokens: 2 })).resolves.toBeUndefined();
    await expect(repository.recordCost("req-1", { promptCostUsd: 0, completionCostUsd: 0, totalCostUsd: 0, currency: "USD" })).resolves.toBeUndefined();
  });
});
