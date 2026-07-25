import { describe, expect, it } from "vitest";
import { InMemoryWorkerRegistry } from "../in-memory-worker.registry";
import { DuplicateWorkerError } from "../../domain/errors/orchestration-domain.errors";

describe("InMemoryWorkerRegistry", () => {
  it("registers and finds workers by capability, in registration order", async () => {
    const registry = new InMemoryWorkerRegistry();
    await registry.register({ agentId: "w1", capabilities: ["research"] });
    await registry.register({ agentId: "w2", capabilities: ["research", "writing"] });

    const eligible = await registry.findByCapability("research");
    expect(eligible.map((w) => w.agentId)).toEqual(["w1", "w2"]);
  });

  it("rejects registering the same worker id twice", async () => {
    const registry = new InMemoryWorkerRegistry();
    await registry.register({ agentId: "w1", capabilities: [] });
    await expect(registry.register({ agentId: "w1", capabilities: [] })).rejects.toThrow(DuplicateWorkerError);
  });

  it("returns an empty list for a capability nobody has", async () => {
    const registry = new InMemoryWorkerRegistry();
    expect(await registry.findByCapability("translation")).toEqual([]);
  });
});
