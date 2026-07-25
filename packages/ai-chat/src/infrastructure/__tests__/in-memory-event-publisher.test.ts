import { describe, it, expect } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { ChatSessionStartedEvent } from "../../events/chat-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribed listeners and supports unsubscribe", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    const unsubscribe = publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: ChatSessionStartedEvent = {
      eventId: "e1",
      kind: "ChatSessionStarted",
      occurredAt: new Date(),
      aggregateId: "s1",
      sessionId: "s1",
    };
    await publisher.publish([event]);
    unsubscribe();
    await publisher.publish([event]);

    expect(received).toEqual(["ChatSessionStarted"]);
  });
});
