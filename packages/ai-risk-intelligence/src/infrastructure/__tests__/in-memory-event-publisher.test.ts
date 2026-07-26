import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { RiskAnalyzedEvent } from "../../events/risk-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: RiskAnalyzedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "RiskAnalyzed") received.push(event);
    });

    const event: RiskAnalyzedEvent = { eventId: "e1", kind: "RiskAnalyzed", occurredAt: new Date(), aggregateId: "s1", subjectId: "s1", verdict: "ACCEPTABLE" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
