import { describe, it, expect } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { ToolInvokedEvent } from "../../events/tool-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: ToolInvokedEvent = { eventId: "e1", kind: "ToolInvoked", occurredAt: new Date(), aggregateId: "i1", invocationId: "i1", toolName: "search" };
    await publisher.publish([event]);

    expect(received).toEqual(["ToolInvoked"]);
  });
});
