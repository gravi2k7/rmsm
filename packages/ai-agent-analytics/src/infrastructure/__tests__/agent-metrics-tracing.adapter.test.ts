import { describe, expect, it } from "vitest";
import {
  AgentRuntime,
  AgentFactory,
  DefaultAgentRegistry,
  DefaultReasoningStrategyRegistry,
  InMemoryAgentExecutionRepository,
  SequentialReasoningStrategy,
  MaxStepsExceededError,
} from "@rmsm/ai-agents";
import { AuditService, InMemoryAuditEntryRepository } from "@rmsm/ai-observability";
import { AgentMetricsTracingAdapter } from "../agent-metrics-tracing.adapter";
import { AgentMetricsService } from "../../application/services/agent-metrics.service";
import { InMemoryAnalyticsRepository } from "../in-memory-analytics.repository";
import { FixedClock, SequentialIdGenerator } from "../../application/__tests__/fakes";

function buildClock() {
  return { now: () => new Date() };
}
function buildRuntimeIdGenerator() {
  let counter = 0;
  return { generate: () => `run-id-${(counter += 1)}` };
}

/**
 * Proves the whole AI-410 chain end to end with REAL, unmodified
 * AI-401 and AI-204 code: a real AgentRuntime publishes AgentDomainEvents
 * through AgentMetricsTracingAdapter, which records them via
 * AgentMetricsService, which (given a real AuditService) ALSO writes
 * them into AI-204's own audit trail — "observability integration."
 */
describe("AgentMetricsTracingAdapter (real @rmsm/ai-agents + @rmsm/ai-observability integration)", () => {
  it("records a completed run's outcome, duration, and audit trail", async () => {
    const analyticsRepository = new InMemoryAnalyticsRepository();
    const auditService = new AuditService(new InMemoryAuditEntryRepository(), new FixedClock(), new SequentialIdGenerator());
    const agentMetricsService = new AgentMetricsService(analyticsRepository, new FixedClock(), new SequentialIdGenerator(), undefined, auditService);
    const tracingAdapter = new AgentMetricsTracingAdapter(agentMetricsService);

    const agentRegistry = new DefaultAgentRegistry();
    const strategyRegistry = new DefaultReasoningStrategyRegistry();
    const executionRepository = new InMemoryAgentExecutionRepository();
    const runtime = new AgentRuntime(agentRegistry, strategyRegistry, executionRepository, buildClock(), buildRuntimeIdGenerator(), tracingAdapter);
    const factory = new AgentFactory(agentRegistry);

    strategyRegistry.register("echo-goal", new SequentialReasoningStrategy([async (context) => `handled: ${context.goals[0]?.description}`]));
    factory.createAgent({ id: "worker-1", name: "Worker", description: "test", reasoningStrategyName: "echo-goal", maxSteps: 5 });

    await runtime.runSync("worker-1", { agentId: "worker-1", sessionId: null, goals: [{ id: "g1", description: "summarize the report" }], variables: {} });

    const summary = await agentMetricsService.getSummary("worker-1");
    expect(summary.totalRuns).toBe(1);
    expect(summary.succeeded).toBe(1);
    expect(summary.successRate).toBe(1);

    const auditHistoryForFirstExecution = await auditService.getHistory("run-id-1");
    expect(auditHistoryForFirstExecution.length).toBeGreaterThan(0);
    expect(auditHistoryForFirstExecution[0]?.action).toBe("AgentRunCompleted");
  });

  it("records a FAILED run when the agent exceeds its max steps", async () => {
    const analyticsRepository = new InMemoryAnalyticsRepository();
    const agentMetricsService = new AgentMetricsService(analyticsRepository, new FixedClock(), new SequentialIdGenerator());
    const tracingAdapter = new AgentMetricsTracingAdapter(agentMetricsService);

    const agentRegistry = new DefaultAgentRegistry();
    const strategyRegistry = new DefaultReasoningStrategyRegistry();
    const executionRepository = new InMemoryAgentExecutionRepository();
    const runtime = new AgentRuntime(agentRegistry, strategyRegistry, executionRepository, buildClock(), buildRuntimeIdGenerator(), tracingAdapter);
    const factory = new AgentFactory(agentRegistry);

    strategyRegistry.register("never-final", { nextStep: async (_context, history) => ({ stepIndex: history.length, isFinal: false }) });
    factory.createAgent({ id: "worker-stuck", name: "Stuck", description: "test", reasoningStrategyName: "never-final", maxSteps: 2 });

    await expect(
      runtime.runSync("worker-stuck", { agentId: "worker-stuck", sessionId: null, goals: [], variables: {} }),
    ).rejects.toThrow(MaxStepsExceededError);

    const summary = await agentMetricsService.getSummary("worker-stuck");
    expect(summary.totalRuns).toBe(1);
    expect(summary.failed).toBe(1);
  });
});
