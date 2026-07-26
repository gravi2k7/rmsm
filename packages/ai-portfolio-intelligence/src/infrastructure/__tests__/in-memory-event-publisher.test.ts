import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { PortfolioHealthAssessedEvent } from "../../events/portfolio-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: PortfolioHealthAssessedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "PortfolioHealthAssessed") received.push(event);
    });

    const event: PortfolioHealthAssessedEvent = { eventId: "e1", kind: "PortfolioHealthAssessed", occurredAt: new Date(), aggregateId: "p1", portfolioId: "p1", verdict: "HEALTHY" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
