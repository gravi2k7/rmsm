import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { StrategyEvaluatedEvent } from "../../events/strategy-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: StrategyEvaluatedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "StrategyEvaluated") received.push(event);
    });

    const event: StrategyEvaluatedEvent = { eventId: "e1", kind: "StrategyEvaluated", occurredAt: new Date(), aggregateId: "s1", strategyId: "s1", verdict: "READY" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
