import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { AgentMemoryDomainEvent } from "../../events/agent-memory-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to every subscriber", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: AgentMemoryDomainEvent = {
      eventId: "evt-1",
      kind: "WorkingMemoryStored",
      occurredAt: new Date(),
      aggregateId: "mem-1",
      agentId: "agent-1",
      key: "scratchpad",
    };
    await publisher.publish([event]);

    expect(received).toEqual(["WorkingMemoryStored"]);
  });
});
