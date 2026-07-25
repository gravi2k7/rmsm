import { describe, it, expect, vi, afterEach } from "vitest";
import { ConsoleTelemetryPublisher } from "../console-telemetry-publisher";
import type { AIRequestStartedEvent } from "../../events/observability-domain-events.interface";

describe("ConsoleTelemetryPublisher", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one JSON line per event to console.log", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const publisher = new ConsoleTelemetryPublisher();
    const event: AIRequestStartedEvent = {
      eventId: "evt-1",
      kind: "AIRequestStarted",
      occurredAt: new Date("2026-01-01T00:00:00.000Z"),
      aggregateId: "req-1",
      requestId: "req-1",
      organizationId: null,
    };

    await publisher.publish([event]);

    expect(logSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(logSpy.mock.calls[0]?.[0] as string);
    expect(parsed.kind).toBe("AIRequestStarted");
    expect(parsed.occurredAt).toBe("2026-01-01T00:00:00.000Z");
  });
});
