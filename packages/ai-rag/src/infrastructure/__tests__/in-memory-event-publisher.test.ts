import { describe, it, expect } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { ChunksIndexedEvent } from "../../events/rag-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.kind);
    });

    const event: ChunksIndexedEvent = { eventId: "e1", kind: "ChunksIndexed", occurredAt: new Date(), aggregateId: "idx", chunkCount: 3 };
    await publisher.publish([event]);

    expect(received).toEqual(["ChunksIndexed"]);
  });
});
