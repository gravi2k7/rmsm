import { describe, it, expect } from "vitest";
import { DefaultAgentRegistry } from "../default-agent.registry";
import { DefaultReasoningStrategyRegistry } from "../default-reasoning-strategy.registry";

describe("DefaultAgentRegistry", () => {
  it("registers, retrieves, and lists agent configs", () => {
    const registry = new DefaultAgentRegistry();
    const config = { id: "a1", name: "Agent One", description: "d", reasoningStrategyName: "s1", maxSteps: 5 };
    registry.register(config);

    expect(registry.get("a1")).toEqual(config);
    expect(registry.list()).toEqual([config]);
  });

  it("returns undefined for an unregistered agent", () => {
    expect(new DefaultAgentRegistry().get("missing")).toBeUndefined();
  });
});

describe("DefaultReasoningStrategyRegistry", () => {
  it("registers and retrieves a strategy by name", () => {
    const registry = new DefaultReasoningStrategyRegistry();
    const strategy = { nextStep: async () => ({ stepIndex: 0, isFinal: true }) };
    registry.register("s1", strategy);
    expect(registry.get("s1")).toBe(strategy);
  });
});
