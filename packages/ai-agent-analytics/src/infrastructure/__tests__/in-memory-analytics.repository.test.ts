import { describe, expect, it } from "vitest";
import { InMemoryAnalyticsRepository } from "../in-memory-analytics.repository";
import { AgentRunOutcome, ToolOutcome, WorkflowRunOutcome } from "../../domain/enums/analytics.enum";
import { CurrencyMismatchError } from "../../domain/errors/agent-analytics-domain.errors";

describe("InMemoryAnalyticsRepository", () => {
  it("aggregates agent run outcomes into success rate and average duration", async () => {
    const repo = new InMemoryAnalyticsRepository();
    await repo.recordAgentRun("agent-1", AgentRunOutcome.COMPLETED, 100);
    await repo.recordAgentRun("agent-1", AgentRunOutcome.COMPLETED, 300);
    await repo.recordAgentRun("agent-1", AgentRunOutcome.FAILED, 200);

    const summary = await repo.getAgentSummary("agent-1");
    expect(summary.totalRuns).toBe(3);
    expect(summary.succeeded).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.successRate).toBeCloseTo(2 / 3);
    expect(summary.averageDurationMs).toBeCloseTo(200);
  });

  it("returns a zeroed summary for an agent with no recorded runs", async () => {
    const repo = new InMemoryAnalyticsRepository();
    const summary = await repo.getAgentSummary("unknown");
    expect(summary).toEqual({ agentId: "unknown", totalRuns: 0, succeeded: 0, failed: 0, cancelled: 0, successRate: 0, averageDurationMs: 0 });
  });

  it("aggregates tool usage across invocation and outcome calls", async () => {
    const repo = new InMemoryAnalyticsRepository();
    await repo.recordToolInvocation("search");
    await repo.recordToolInvocation("search");
    await repo.recordToolOutcome("search", ToolOutcome.SUCCEEDED);
    await repo.recordToolOutcome("search", ToolOutcome.TIMED_OUT);

    const usage = await repo.getToolUsage("search");
    expect(usage).toEqual({ toolName: "search", invocations: 2, succeeded: 1, failed: 0, timedOut: 1 });
  });

  it("aggregates planning metrics", async () => {
    const repo = new InMemoryAnalyticsRepository();
    await repo.recordPlanCreated();
    await repo.recordPlanValidated(true);
    await repo.recordPlanValidated(false);
    await repo.recordReplanned();

    expect(await repo.getPlanningMetrics()).toEqual({ plansCreated: 1, validPlans: 1, invalidPlans: 1, replans: 1 });
  });

  it("aggregates workflow run outcomes into a success rate", async () => {
    const repo = new InMemoryAnalyticsRepository();
    await repo.recordWorkflowRunTerminal(WorkflowRunOutcome.COMPLETED);
    await repo.recordWorkflowRunTerminal(WorkflowRunOutcome.FAILED);

    const metrics = await repo.getWorkflowMetrics();
    expect(metrics.totalRuns).toBe(2);
    expect(metrics.successRate).toBeCloseTo(0.5);
  });

  it("counts memory writes per agent", async () => {
    const repo = new InMemoryAnalyticsRepository();
    await repo.recordMemoryWrite("agent-1");
    await repo.recordMemoryWrite("agent-1");
    await repo.recordMemoryWrite("agent-2");

    expect(await repo.getMemoryUsage("agent-1")).toEqual({ agentId: "agent-1", writeCount: 2 });
    expect(await repo.getMemoryUsage("agent-2")).toEqual({ agentId: "agent-2", writeCount: 1 });
  });

  it("sums cost entries and rejects a mismatched currency for the same agent", async () => {
    const repo = new InMemoryAnalyticsRepository();
    await repo.recordCost("agent-1", 1.5, "USD");
    await repo.recordCost("agent-1", 2.5, "USD");

    expect(await repo.getCostSummary("agent-1")).toEqual({ agentId: "agent-1", totalAmount: 4, currency: "USD", entryCount: 2 });
    await expect(repo.recordCost("agent-1", 1, "EUR")).rejects.toThrow(CurrencyMismatchError);
  });
});
