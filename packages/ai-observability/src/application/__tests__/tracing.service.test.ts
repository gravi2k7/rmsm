import { describe, it, expect, beforeEach } from "vitest";
import { TracingService } from "../services/tracing.service";
import { AIRequestStatus } from "../../domain/enums/observability.enum";
import { AIRequestNotFoundError, DuplicateAIRequestError } from "../../domain/errors/observability-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingTelemetryPublisher, makeTraceRepository } from "./fakes";
import type { TraceRepository } from "../../tracing/trace-repository.interface";

describe("TracingService", () => {
  let traceRepository: TraceRepository;
  let telemetryPublisher: RecordingTelemetryPublisher;
  let clock: FixedClock;
  let idGenerator: SequentialIdGenerator;
  let service: TracingService;

  beforeEach(() => {
    traceRepository = makeTraceRepository();
    telemetryPublisher = new RecordingTelemetryPublisher();
    clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    idGenerator = new SequentialIdGenerator();
    service = new TracingService(traceRepository, telemetryPublisher, clock, idGenerator);
  });

  it("starts a request, persists it, and publishes AIRequestStarted", async () => {
    const request = await service.startRequest("req-1", "org-1");

    expect(request.status).toBe(AIRequestStatus.PENDING);
    expect(await traceRepository.findRequestById("req-1")).toEqual(request);
    expect(telemetryPublisher.published).toHaveLength(1);
    expect(telemetryPublisher.published[0]?.kind).toBe("AIRequestStarted");
  });

  it("rejects starting a request with a duplicate id", async () => {
    await service.startRequest("req-1", null);
    await expect(service.startRequest("req-1", null)).rejects.toThrow(DuplicateAIRequestError);
  });

  it("records a prompt trace and publishes PromptRendered", async () => {
    await service.startRequest("req-1", null);
    await service.recordPromptRendered({
      requestId: "req-1",
      templateId: "tpl-1",
      templateVersion: "1.0.0",
      renderedText: "hello",
      occurredAt: clock.now(),
    });

    expect(telemetryPublisher.published.map((e) => e.kind)).toContain("PromptRendered");
  });

  it("records a memory trace and publishes MemoryLoaded", async () => {
    await service.startRequest("req-1", null);
    await service.recordMemoryLoaded({
      requestId: "req-1",
      conversationId: "conv-1",
      entryCount: 3,
      occurredAt: clock.now(),
    });

    expect(telemetryPublisher.published.map((e) => e.kind)).toContain("MemoryLoaded");
  });

  it("records a provider trace and publishes ProviderCalled", async () => {
    await service.startRequest("req-1", null);
    await service.recordProviderCalled({
      requestId: "req-1",
      providerName: "openai",
      model: "gpt-5",
      startedAt: clock.now(),
      completedAt: null,
      succeeded: null,
    });

    expect(telemetryPublisher.published.map((e) => e.kind)).toContain("ProviderCalled");
  });

  it("completes a request, saves the response, and publishes ProviderCompleted for each provider trace", async () => {
    await service.startRequest("req-1", null);
    await service.recordProviderCalled({
      requestId: "req-1",
      providerName: "openai",
      model: "gpt-5",
      startedAt: clock.now(),
      completedAt: null,
      succeeded: null,
    });

    clock.advance(500);
    await service.completeRequest(
      "req-1",
      { requestId: "req-1", content: "hi", tokenUsage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }, occurredAt: clock.now() },
      true,
    );

    const updated = await traceRepository.findRequestById("req-1");
    expect(updated?.status).toBe(AIRequestStatus.SUCCEEDED);
    expect(updated?.completedAt).not.toBeNull();

    const completedEvents = telemetryPublisher.published.filter((e) => e.kind === "ProviderCompleted");
    expect(completedEvents).toHaveLength(1);
  });

  it("throws AIRequestNotFoundError when completing an unknown request", async () => {
    await expect(
      service.completeRequest(
        "missing",
        { requestId: "missing", content: "", tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, occurredAt: clock.now() },
        true,
      ),
    ).rejects.toThrow(AIRequestNotFoundError);
  });

  it("records a failure, marks the request FAILED, and publishes RequestFailed", async () => {
    await service.startRequest("req-1", null);
    await service.recordFailure("req-1", "provider timeout", "TIMEOUT");

    const updated = await traceRepository.findRequestById("req-1");
    expect(updated?.status).toBe(AIRequestStatus.FAILED);
    expect(telemetryPublisher.published.map((e) => e.kind)).toContain("RequestFailed");
  });

  it("throws AIRequestNotFoundError when recording a failure for an unknown request", async () => {
    await expect(service.recordFailure("missing", "x")).rejects.toThrow(AIRequestNotFoundError);
  });
});
