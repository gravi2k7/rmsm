import { describe, it, expect } from "vitest";
import { AgentFactory } from "../services/agent-factory.service";
import { DefaultAgentRegistry } from "../../infrastructure/default-agent.registry";
import { InvalidAgentConfigError } from "../../domain/errors/agent-domain.errors";

describe("AgentFactory", () => {
  it("validates and registers a well-formed AgentConfig", () => {
    const registry = new DefaultAgentRegistry();
    const factory = new AgentFactory(registry);
    const config = { id: "a1", name: "Agent One", description: "d", reasoningStrategyName: "s1", maxSteps: 3 };

    factory.createAgent(config);

    expect(registry.get("a1")).toEqual(config);
  });

  it("rejects a config with an empty id", () => {
    const factory = new AgentFactory(new DefaultAgentRegistry());
    expect(() => factory.createAgent({ id: "", name: "n", description: "d", reasoningStrategyName: "s1", maxSteps: 3 })).toThrow(InvalidAgentConfigError);
  });

  it("rejects a config with a non-positive maxSteps", () => {
    const factory = new AgentFactory(new DefaultAgentRegistry());
    expect(() => factory.createAgent({ id: "a1", name: "n", description: "d", reasoningStrategyName: "s1", maxSteps: 0 })).toThrow(InvalidAgentConfigError);
  });

  it("builds an AgentContext from goals and variables", () => {
    const factory = new AgentFactory(new DefaultAgentRegistry());
    const context = factory.createContext("a1", [{ id: "g1", description: "goal" }], { foo: "bar" }, "session-1");

    expect(context).toEqual({ agentId: "a1", sessionId: "session-1", goals: [{ id: "g1", description: "goal" }], variables: { foo: "bar" } });
  });
});
