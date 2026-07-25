import { describe, it, expect } from "vitest";
import { AgentRuntime } from "../services/agent-runtime.service";
import { DefaultAgentRegistry } from "../../infrastructure/default-agent.registry";
import { DefaultReasoningStrategyRegistry } from "../../infrastructure/default-reasoning-strategy.registry";
import { InMemoryAgentExecutionRepository } from "../../infrastructure/in-memory-agent-execution.repository";
import { SequentialReasoningStrategy } from "../../infrastructure/sequential-reasoning.strategy";
import { SimpleCancellationToken } from "../../infrastructure/simple-cancellation.token";
import { AgentStatus } from "../../domain/enums/agent.enum";
import { AgentNotFoundError, ReasoningStrategyNotFoundError, MaxStepsExceededError } from "../../domain/errors/agent-domain.errors";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";
import type { AgentConfig } from "../../domain/entities/agent-config.entity";
import type { AgentContext } from "../../domain/entities/agent-context.entity";

function setup() {
  const agentRegistry = new DefaultAgentRegistry();
  const strategyRegistry = new DefaultReasoningStrategyRegistry();
  const executionRepository = new InMemoryAgentExecutionRepository();
  const events = new RecordingEventPublisher();
  const runtime = new AgentRuntime(agentRegistry, strategyRegistry, executionRepository, new SystemLikeClock(), new SequentialIdGenerator(), events);
  return { agentRegistry, strategyRegistry, executionRepository, events, runtime };
}

const context: AgentContext = { agentId: "a1", sessionId: null, goals: [], variables: {} };

describe("AgentRuntime", () => {
  it("runs an agent synchronously to completion, returning its final output", async () => {
    const { agentRegistry, strategyRegistry, runtime } = setup();
    const config: AgentConfig = { id: "a1", name: "n", description: "d", reasoningStrategyName: "seq", maxSteps: 3 };
    agentRegistry.register(config);
    strategyRegistry.register("seq", new SequentialReasoningStrategy([async () => "step1", async () => "final"]));

    const result = await runtime.runSync("a1", context);

    expect(result.status).toBe(AgentStatus.COMPLETED);
    expect(result.output).toBe("final");
    expect(result.steps).toHaveLength(2);
  });

  it("publishes AgentStarted, AgentStepCompleted (x2), and AgentCompleted in order", async () => {
    const { agentRegistry, strategyRegistry, runtime, events } = setup();
    agentRegistry.register({ id: "a1", name: "n", description: "d", reasoningStrategyName: "seq", maxSteps: 3 });
    strategyRegistry.register("seq", new SequentialReasoningStrategy([async () => "s1", async () => "s2"]));

    await runtime.runSync("a1", context);

    expect(events.published.map((e) => e.kind)).toEqual(["AgentStarted", "AgentStepCompleted", "AgentStepCompleted", "AgentCompleted"]);
  });

  it("runs an agent asynchronously, resolving status via getStatus() polling", async () => {
    const { agentRegistry, strategyRegistry, runtime } = setup();
    agentRegistry.register({ id: "a1", name: "n", description: "d", reasoningStrategyName: "seq", maxSteps: 2 });
    strategyRegistry.register("seq", new SequentialReasoningStrategy([async () => "only"]));

    const executionId = await runtime.runAsync("a1", context);
    // give the background execution a tick to run to completion
    await new Promise((resolve) => setTimeout(resolve, 10));

    const state = await runtime.getStatus(executionId);
    expect(state.status).toBe(AgentStatus.COMPLETED);
  });

  it("streams each AgentStepResult as it's produced", async () => {
    const { agentRegistry, strategyRegistry, runtime } = setup();
    agentRegistry.register({ id: "a1", name: "n", description: "d", reasoningStrategyName: "seq", maxSteps: 3 });
    strategyRegistry.register("seq", new SequentialReasoningStrategy([async () => "s1", async () => "s2"]));

    const chunks = [];
    for await (const step of runtime.stream("a1", context)) {
      chunks.push(step);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[1]?.isFinal).toBe(true);
  });

  it("stops early once cancelled, marking the run CANCELLED", async () => {
    const { agentRegistry, strategyRegistry, runtime } = setup();
    const token = new SimpleCancellationToken();
    agentRegistry.register({ id: "a1", name: "n", description: "d", reasoningStrategyName: "seq", maxSteps: 5 });
    strategyRegistry.register(
      "seq",
      new SequentialReasoningStrategy([
        async () => {
          token.cancel();
          return "s1";
        },
        async () => "s2",
      ]),
    );

    const result = await runtime.runSync("a1", context, token);

    expect(result.status).toBe(AgentStatus.CANCELLED);
    expect(result.steps).toHaveLength(1);
  });

  it("throws MaxStepsExceededError when the strategy never reports isFinal within maxSteps", async () => {
    const { agentRegistry, strategyRegistry, runtime } = setup();
    agentRegistry.register({ id: "a1", name: "n", description: "d", reasoningStrategyName: "seq", maxSteps: 2 });
    strategyRegistry.register("seq", { nextStep: async (_ctx, history) => ({ stepIndex: history.length, isFinal: false }) });

    await expect(runtime.runSync("a1", context)).rejects.toThrow(MaxStepsExceededError);
  });

  it("throws AgentNotFoundError for an unregistered agent", async () => {
    const { runtime } = setup();
    await expect(runtime.runSync("missing", context)).rejects.toThrow(AgentNotFoundError);
  });

  it("throws ReasoningStrategyNotFoundError when the config's strategy isn't registered", async () => {
    const { agentRegistry, runtime } = setup();
    agentRegistry.register({ id: "a1", name: "n", description: "d", reasoningStrategyName: "missing", maxSteps: 3 });
    await expect(runtime.runSync("a1", context)).rejects.toThrow(ReasoningStrategyNotFoundError);
  });
});
