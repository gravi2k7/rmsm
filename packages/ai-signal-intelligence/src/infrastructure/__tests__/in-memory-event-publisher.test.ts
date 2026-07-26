import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { SignalQualityAssessedEvent } from "../../events/signal-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: SignalQualityAssessedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "SignalQualityAssessed") received.push(event);
    });

    const event: SignalQualityAssessedEvent = { eventId: "e1", kind: "SignalQualityAssessed", occurredAt: new Date(), aggregateId: "o1", opportunityId: "o1", verdict: "HIGH" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
