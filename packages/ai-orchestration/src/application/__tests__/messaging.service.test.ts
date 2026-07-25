import { describe, expect, it } from "vitest";
import { MessagingService } from "../services/messaging.service";
import { InMemoryMessageBus } from "../../infrastructure/in-memory-message.bus";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("MessagingService", () => {
  it("delivers a message to the recipient and publishes AgentMessageSent", async () => {
    const events = new RecordingEventPublisher();
    const service = new MessagingService(new InMemoryMessageBus(), new SystemLikeClock(), new SequentialIdGenerator(), events);

    const received: unknown[] = [];
    service.subscribe("worker-1", (message) => {
      received.push(message.content);
    });

    await service.send("coordinator-1", "worker-1", { instruction: "begin" });

    expect(received).toEqual([{ instruction: "begin" }]);
    expect(events.published.map((e) => e.kind)).toEqual(["AgentMessageSent"]);
  });
});
