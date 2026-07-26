import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { ExecutiveReportGeneratedEvent } from "../../events/executive-reports-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: ExecutiveReportGeneratedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "ExecutiveReportGenerated") received.push(event);
    });

    const event: ExecutiveReportGeneratedEvent = { eventId: "e1", kind: "ExecutiveReportGenerated", occurredAt: new Date(), aggregateId: "p1", portfolioId: "p1", period: "WEEKLY" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
