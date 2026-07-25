import { describe, it, expect, vi } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { MemoryDomainEvent } from "../../events/memory-domain-events.interface";

function makeEvent(id: string): MemoryDomainEvent {
  return {
    eventId: id,
    kind: "MemoryStored",
    occurredAt: new Date("2026-01-01T00:00:00.000Z"),
    aggregateId: "mem-1",
    memoryId: "mem-1",
  } as unknown as MemoryDomainEvent;
}

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners, in order", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: string[] = [];
    publisher.subscribe((event) => {
      received.push(event.eventId);
    });

    await publisher.publish([makeEvent("evt-1"), makeEvent("evt-2")]);

    expect(received).toEqual(["evt-1", "evt-2"]);
  });

  it("supports multiple listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const listenerA = vi.fn();
    const listenerB = vi.fn();
    publisher.subscribe(listenerA);
    publisher.subscribe(listenerB);

    await publisher.publish([makeEvent("evt-1")]);

    expect(listenerA).toHaveBeenCalledTimes(1);
    expect(listenerB).toHaveBeenCalledTimes(1);
  });

  it("stops delivering to a listener after it unsubscribes", async () => {
    const publisher = new InMemoryEventPublisher();
    const listener = vi.fn();
    const unsubscribe = publisher.subscribe(listener);
    unsubscribe();

    await publisher.publish([makeEvent("evt-1")]);

    expect(listener).not.toHaveBeenCalled();
  });

  it("awaits async listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const order: string[] = [];
    publisher.subscribe(async (event) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      order.push(`handled:${event.eventId}`);
    });

    await publisher.publish([makeEvent("evt-1")]);

    expect(order).toEqual(["handled:evt-1"]);
  });
});
