import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { NewsAnalyzedEvent } from "../../events/news-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: NewsAnalyzedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "NewsAnalyzed") received.push(event);
    });

    const event: NewsAnalyzedEvent = { eventId: "e1", kind: "NewsAnalyzed", occurredAt: new Date(), aggregateId: "a1", articleId: "a1", sentimentLabel: "POSITIVE", impactLevel: "LOW" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
