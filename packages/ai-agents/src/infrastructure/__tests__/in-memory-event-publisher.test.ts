import { describe, it, expect } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { AgentStartedEvent } from "../../events/agent-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: AgentStartedEvent = { eventId: "e1", kind: "AgentStarted", occurredAt: new Date(), aggregateId: "x1", executionId: "x1", agentId: "a1" };
    await publisher.publish([event]);

    expect(received).toEqual(["AgentStarted"]);
  });
});
