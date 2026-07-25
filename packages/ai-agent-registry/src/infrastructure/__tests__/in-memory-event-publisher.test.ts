import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { AgentRegisteredEvent } from "../../events/agent-registry-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribers", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: AgentRegisteredEvent = { eventId: "e1", kind: "AgentRegistered", occurredAt: new Date(), aggregateId: "a1", agentId: "a1" };
    await publisher.publish([event]);

    expect(received).toEqual(["AgentRegistered"]);
  });
});
