import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { AgentRunRecordedEvent } from "../../events/agent-analytics-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribers", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: AgentRunRecordedEvent = { eventId: "e1", kind: "AgentRunRecorded", occurredAt: new Date(), aggregateId: "agent-1", agentId: "agent-1" };
    await publisher.publish([event]);

    expect(received).toEqual(["AgentRunRecorded"]);
  });
});
