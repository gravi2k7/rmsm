import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { ExecutiveDashboardGeneratedEvent } from "../../events/executive-dashboard-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: ExecutiveDashboardGeneratedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "ExecutiveDashboardGenerated") received.push(event);
    });

    const event: ExecutiveDashboardGeneratedEvent = { eventId: "e1", kind: "ExecutiveDashboardGenerated", occurredAt: new Date(), aggregateId: "p1", portfolioId: "p1", widgetCount: 3 };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
