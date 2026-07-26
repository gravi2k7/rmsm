import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { BacktestInterpretedEvent } from "../../events/backtest-intelligence-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: BacktestInterpretedEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "BacktestInterpreted") received.push(event);
    });

    const event: BacktestInterpretedEvent = { eventId: "e1", kind: "BacktestInterpreted", occurredAt: new Date(), aggregateId: "run-1", runId: "run-1", verdict: "STRONG" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
