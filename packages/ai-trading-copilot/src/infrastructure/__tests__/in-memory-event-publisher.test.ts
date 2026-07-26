import { describe, expect, it } from "vitest";
import { InMemoryEventPublisher } from "../in-memory-event-publisher";
import type { CopilotQuestionAnsweredEvent } from "../../events/trading-copilot-domain-events.interface";

describe("InMemoryEventPublisher", () => {
  it("delivers published events to subscribed listeners", async () => {
    const publisher = new InMemoryEventPublisher();
    const received: CopilotQuestionAnsweredEvent[] = [];
    publisher.subscribe((event) => {
      if (event.kind === "CopilotQuestionAnswered") received.push(event);
    });

    const event: CopilotQuestionAnsweredEvent = { eventId: "e1", kind: "CopilotQuestionAnswered", occurredAt: new Date(), aggregateId: "s1", sessionId: "s1", intent: "GENERAL" };
    await publisher.publish([event]);

    expect(received).toEqual([event]);
  });
});
