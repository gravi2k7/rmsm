import { describe, expect, it } from "vitest";
import {
  AgentRuntime,
  AgentFactory,
  DefaultAgentRegistry,
  DefaultReasoningStrategyRegistry,
  InMemoryAgentExecutionRepository,
  SequentialReasoningStrategy,
} from "@rmsm/ai-agents";
import { AgentRuntimeWorkerExecutor } from "../agent-runtime-worker.executor";

function buildClock() {
  return { now: () => new Date() };
}
function buildIdGenerator() {
  let counter = 0;
  return { generate: () => `run-id-${(counter += 1)}` };
}

describe("AgentRuntimeWorkerExecutor (real @rmsm/ai-agents integration)", () => {
  it("runs a registered worker agent through a real AgentRuntime and reports success", async () => {
    const agentRegistry = new DefaultAgentRegistry();
    const strategyRegistry = new DefaultReasoningStrategyRegistry();
    const executionRepository = new InMemoryAgentExecutionRepository();
    const runtime = new AgentRuntime(agentRegistry, strategyRegistry, executionRepository, buildClock(), buildIdGenerator());
    const factory = new AgentFactory(agentRegistry);

    strategyRegistry.register("summarize-goal", new SequentialReasoningStrategy([async (context) => `done: ${context.goals[0]?.description}`]));
    factory.createAgent({ id: "worker-summarizer", name: "Summarizer", description: "test", reasoningStrategyName: "summarize-goal", maxSteps: 5 });

    const executor = new AgentRuntimeWorkerExecutor(runtime);
    const result = await executor.execute("worker-summarizer", { id: "goal-1", description: "summarize the quarterly report" });

    expect(result.success).toBe(true);
    expect(result.output).toBe("done: summarize the quarterly report");
  });

  it("reports failure when the underlying agent run throws MaxStepsExceededError", async () => {
    const agentRegistry = new DefaultAgentRegistry();
    const strategyRegistry = new DefaultReasoningStrategyRegistry();
    const executionRepository = new InMemoryAgentExecutionRepository();
    const runtime = new AgentRuntime(agentRegistry, strategyRegistry, executionRepository, buildClock(), buildIdGenerator());
    const factory = new AgentFactory(agentRegistry);

    // A strategy whose nextStep never reports isFinal will exceed maxSteps.
    strategyRegistry.register("never-final", { nextStep: async (_context, history) => ({ stepIndex: history.length, isFinal: false }) });
    factory.createAgent({ id: "worker-stuck", name: "Stuck", description: "test", reasoningStrategyName: "never-final", maxSteps: 2 });

    const executor = new AgentRuntimeWorkerExecutor(runtime);
    const result = await executor.execute("worker-stuck", { id: "goal-2", description: "anything" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("worker-stuck");
  });
});
