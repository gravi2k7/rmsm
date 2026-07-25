import { describe, expect, it } from "vitest";
import { InMemoryMessageBus } from "../in-memory-message.bus";

describe("InMemoryMessageBus", () => {
  it("delivers a message only to subscribers of the recipient agent", async () => {
    const bus = new InMemoryMessageBus();
    const receivedByWorker: unknown[] = [];
    const receivedByOther: unknown[] = [];
    bus.subscribe("worker-1", (message) => {
      receivedByWorker.push(message.content);
    });
    bus.subscribe("worker-2", (message) => {
      receivedByOther.push(message.content);
    });

    await bus.send({ id: "m1", fromAgentId: "coordinator-1", toAgentId: "worker-1", content: "start", sentAt: new Date() });

    expect(receivedByWorker).toEqual(["start"]);
    expect(receivedByOther).toEqual([]);
  });

  it("stops delivering after unsubscribe", async () => {
    const bus = new InMemoryMessageBus();
    const received: unknown[] = [];
    const unsubscribe = bus.subscribe("worker-1", (message) => {
      received.push(message.content);
    });
    unsubscribe();

    await bus.send({ id: "m1", fromAgentId: "coordinator-1", toAgentId: "worker-1", content: "start", sentAt: new Date() });
    expect(received).toEqual([]);
  });
});
