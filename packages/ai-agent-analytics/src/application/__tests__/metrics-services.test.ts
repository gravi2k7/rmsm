import { describe, expect, it } from "vitest";
import { AgentMetricsService } from "../services/agent-metrics.service";
import { ToolUsageService } from "../services/tool-usage.service";
import { PlanningMetricsService } from "../services/planning-metrics.service";
import { WorkflowMetricsService } from "../services/workflow-metrics.service";
import { MemoryUsageService } from "../services/memory-usage.service";
import { CostMetricsService } from "../services/cost-metrics.service";
import { InMemoryAnalyticsRepository } from "../../infrastructure/in-memory-analytics.repository";
import { AgentRunOutcome, ToolOutcome, WorkflowRunOutcome } from "../../domain/enums/analytics.enum";
import { NegativeDurationError, NegativeCostAmountError } from "../../domain/errors/agent-analytics-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("AgentMetricsService", () => {
  it("records a run and publishes AgentRunRecorded", async () => {
    const events = new RecordingEventPublisher();
    const repository = new InMemoryAnalyticsRepository();
    const service = new AgentMetricsService(repository, new FixedClock(), new SequentialIdGenerator(), events);

    await service.recordRun("agent-1", "exec-1", AgentRunOutcome.COMPLETED, 500);
    const summary = await service.getSummary("agent-1");

    expect(summary.totalRuns).toBe(1);
    expect(events.published.map((e) => e.kind)).toEqual(["AgentRunRecorded"]);
  });

  it("rejects a negative duration", async () => {
    const service = new AgentMetricsService(new InMemoryAnalyticsRepository(), new FixedClock(), new SequentialIdGenerator());
    await expect(service.recordRun("agent-1", "exec-1", AgentRunOutcome.COMPLETED, -1)).rejects.toThrow(NegativeDurationError);
  });
});

describe("ToolUsageService", () => {
  it("records invocations and outcomes", async () => {
    const service = new ToolUsageService(new InMemoryAnalyticsRepository(), new FixedClock(), new SequentialIdGenerator());
    await service.recordInvocation("search");
    await service.recordOutcome("search", ToolOutcome.SUCCEEDED);

    const usage = await service.getUsage("search");
    expect(usage.invocations).toBe(1);
    expect(usage.succeeded).toBe(1);
  });
});

describe("PlanningMetricsService", () => {
  it("records planning lifecycle events", async () => {
    const service = new PlanningMetricsService(new InMemoryAnalyticsRepository(), new FixedClock(), new SequentialIdGenerator());
    await service.recordPlanCreated();
    await service.recordPlanValidated(true);
    await service.recordReplanned();

    expect(await service.getMetrics()).toEqual({ plansCreated: 1, validPlans: 1, invalidPlans: 0, replans: 1 });
  });
});

describe("WorkflowMetricsService", () => {
  it("records workflow run outcomes", async () => {
    const service = new WorkflowMetricsService(new InMemoryAnalyticsRepository(), new FixedClock(), new SequentialIdGenerator());
    await service.recordRunTerminal(WorkflowRunOutcome.COMPLETED);

    const metrics = await service.getMetrics();
    expect(metrics.totalRuns).toBe(1);
    expect(metrics.successRate).toBe(1);
  });
});

describe("MemoryUsageService", () => {
  it("records memory writes per agent", async () => {
    const service = new MemoryUsageService(new InMemoryAnalyticsRepository(), new FixedClock(), new SequentialIdGenerator());
    await service.recordWrite("agent-1");
    await service.recordWrite("agent-1");

    expect(await service.getUsage("agent-1")).toEqual({ agentId: "agent-1", writeCount: 2 });
  });
});

describe("CostMetricsService", () => {
  it("records cost and rejects a negative amount", async () => {
    const service = new CostMetricsService(new InMemoryAnalyticsRepository(), new FixedClock(), new SequentialIdGenerator());
    await service.recordCost("agent-1", 2.5, "USD");

    expect(await service.getSummary("agent-1")).toEqual({ agentId: "agent-1", totalAmount: 2.5, currency: "USD", entryCount: 1 });
    await expect(service.recordCost("agent-1", -1, "USD")).rejects.toThrow(NegativeCostAmountError);
  });
});
