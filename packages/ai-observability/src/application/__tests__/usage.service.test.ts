import { describe, it, expect, beforeEach } from "vitest";
import { UsageService } from "../services/usage.service";
import { SequentialIdGenerator, RecordingTelemetryPublisher, makeMetricsRepository } from "./fakes";
import type { MetricsRepository } from "../../metrics/metrics-repository.interface";

describe("UsageService", () => {
  let metricsRepository: MetricsRepository;
  let telemetryPublisher: RecordingTelemetryPublisher;
  let service: UsageService;

  beforeEach(() => {
    metricsRepository = makeMetricsRepository();
    telemetryPublisher = new RecordingTelemetryPublisher();
    service = new UsageService(metricsRepository, telemetryPublisher, new SequentialIdGenerator());
  });

  it("records usage and publishes UsageRecorded", async () => {
    await service.recordUsage("req-1", { promptTokens: 100, completionTokens: 50, totalTokens: 150 }, new Date());

    expect(telemetryPublisher.published).toHaveLength(1);
    expect(telemetryPublisher.published[0]?.kind).toBe("UsageRecorded");
  });
});
