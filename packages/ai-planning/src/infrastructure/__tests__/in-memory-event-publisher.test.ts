import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { PlanCreatedEvent } from "../../events/planning-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribers", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: PlanCreatedEvent = {
      eventId: "e1",
      kind: "PlanCreated",
      occurredAt: new Date(),
      aggregateId: "plan-1",
      planId: "plan-1",
      goalId: "goal-1",
      taskCount: 2,
    };
    await publisher.publish([event]);

    expect(received).toEqual(["PlanCreated"]);
  });
});
