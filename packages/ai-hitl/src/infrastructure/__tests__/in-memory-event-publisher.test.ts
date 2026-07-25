import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { ApprovalRequestedEvent } from "../../events/hitl-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribers", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: ApprovalRequestedEvent = { eventId: "e1", kind: "ApprovalRequested", occurredAt: new Date(), aggregateId: "r1", requestId: "r1", agentId: "a1", queueName: "ops" };
    await publisher.publish([event]);

    expect(received).toEqual(["ApprovalRequested"]);
  });
});
