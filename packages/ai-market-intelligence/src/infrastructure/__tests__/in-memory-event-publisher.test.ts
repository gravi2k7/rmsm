import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { MarketSummaryGeneratedEvent } from "../../events/market-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribers", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: MarketSummaryGeneratedEvent = { eventId: "e1", kind: "MarketSummaryGenerated", occurredAt: new Date(), aggregateId: "EURUSD", symbolCode: "EURUSD" };
    await publisher.publish([event]);

    expect(received).toEqual(["MarketSummaryGenerated"]);
  });
});
