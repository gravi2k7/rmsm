import type { AnalyticsRepository } from "../repositories/analytics-repository.interface";
import { AgentRunOutcome, ToolOutcome, WorkflowRunOutcome } from "../domain/enums/analytics.enum";
import type { AgentMetricsSummary } from "../domain/entities/agent-metrics-summary.entity";
import type { ToolUsageMetric } from "../domain/entities/tool-usage-metric.entity";
import type { PlanningMetric } from "../domain/entities/planning-metric.entity";
import type { WorkflowRunMetric } from "../domain/entities/workflow-run-metric.entity";
import type { MemoryUsageMetric } from "../domain/entities/memory-usage-metric.entity";
import type { CostSummary } from "../domain/entities/cost-summary.entity";
import { CurrencyMismatchError } from "../domain/errors/agent-analytics-domain.errors";

interface AgentAccumulator {
  totalRuns: number;
  succeeded: number;
  failed: number;
  cancelled: number;
  totalDurationMs: number;
}

interface ToolAccumulator {
  invocations: number;
  succeeded: number;
  failed: number;
  timedOut: number;
}

interface WorkflowAccumulator {
  totalRuns: number;
  succeeded: number;
  failed: number;
  cancelled: number;
}

interface CostAccumulator {
  totalAmount: number;
  currency: string | null;
  entryCount: number;
}

/** The one real `AnalyticsRepository`: every `record*` call updates a
 * running in-memory accumulator; every `get*` call derives the public
 * summary shape (rates, averages) from that accumulator on read. */
export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  private readonly agentAccumulators = new Map<string, AgentAccumulator>();
  private readonly toolAccumulators = new Map<string, ToolAccumulator>();
  private readonly memoryWriteCounts = new Map<string, number>();
  private readonly costAccumulators = new Map<string, CostAccumulator>();
  private planning: PlanningMetric = { plansCreated: 0, validPlans: 0, invalidPlans: 0, replans: 0 };
  private workflow: WorkflowAccumulator = { totalRuns: 0, succeeded: 0, failed: 0, cancelled: 0 };

  async recordAgentRun(agentId: string, outcome: AgentRunOutcome, durationMs: number): Promise<void> {
    const acc = this.agentAccumulators.get(agentId) ?? { totalRuns: 0, succeeded: 0, failed: 0, cancelled: 0, totalDurationMs: 0 };
    acc.totalRuns += 1;
    acc.totalDurationMs += durationMs;
    if (outcome === AgentRunOutcome.COMPLETED) acc.succeeded += 1;
    else if (outcome === AgentRunOutcome.FAILED) acc.failed += 1;
    else acc.cancelled += 1;
    this.agentAccumulators.set(agentId, acc);
  }

  async getAgentSummary(agentId: string): Promise<AgentMetricsSummary> {
    const acc = this.agentAccumulators.get(agentId) ?? { totalRuns: 0, succeeded: 0, failed: 0, cancelled: 0, totalDurationMs: 0 };
    return {
      agentId,
      totalRuns: acc.totalRuns,
      succeeded: acc.succeeded,
      failed: acc.failed,
      cancelled: acc.cancelled,
      successRate: acc.totalRuns === 0 ? 0 : acc.succeeded / acc.totalRuns,
      averageDurationMs: acc.totalRuns === 0 ? 0 : acc.totalDurationMs / acc.totalRuns,
    };
  }

  async recordToolInvocation(toolName: string): Promise<void> {
    const acc = this.toolAccumulators.get(toolName) ?? { invocations: 0, succeeded: 0, failed: 0, timedOut: 0 };
    acc.invocations += 1;
    this.toolAccumulators.set(toolName, acc);
  }

  async recordToolOutcome(toolName: string, outcome: ToolOutcome): Promise<void> {
    const acc = this.toolAccumulators.get(toolName) ?? { invocations: 0, succeeded: 0, failed: 0, timedOut: 0 };
    if (outcome === ToolOutcome.SUCCEEDED) acc.succeeded += 1;
    else if (outcome === ToolOutcome.FAILED) acc.failed += 1;
    else acc.timedOut += 1;
    this.toolAccumulators.set(toolName, acc);
  }

  async getToolUsage(toolName: string): Promise<ToolUsageMetric> {
    const acc = this.toolAccumulators.get(toolName) ?? { invocations: 0, succeeded: 0, failed: 0, timedOut: 0 };
    return { toolName, ...acc };
  }

  async recordPlanCreated(): Promise<void> {
    this.planning = { ...this.planning, plansCreated: this.planning.plansCreated + 1 };
  }

  async recordPlanValidated(valid: boolean): Promise<void> {
    this.planning = valid
      ? { ...this.planning, validPlans: this.planning.validPlans + 1 }
      : { ...this.planning, invalidPlans: this.planning.invalidPlans + 1 };
  }

  async recordReplanned(): Promise<void> {
    this.planning = { ...this.planning, replans: this.planning.replans + 1 };
  }

  async getPlanningMetrics(): Promise<PlanningMetric> {
    return this.planning;
  }

  async recordWorkflowRunTerminal(outcome: WorkflowRunOutcome): Promise<void> {
    this.workflow.totalRuns += 1;
    if (outcome === WorkflowRunOutcome.COMPLETED) this.workflow.succeeded += 1;
    else if (outcome === WorkflowRunOutcome.FAILED) this.workflow.failed += 1;
    else this.workflow.cancelled += 1;
  }

  async getWorkflowMetrics(): Promise<WorkflowRunMetric> {
    const { totalRuns, succeeded, failed, cancelled } = this.workflow;
    return { totalRuns, succeeded, failed, cancelled, successRate: totalRuns === 0 ? 0 : succeeded / totalRuns };
  }

  async recordMemoryWrite(agentId: string): Promise<void> {
    this.memoryWriteCounts.set(agentId, (this.memoryWriteCounts.get(agentId) ?? 0) + 1);
  }

  async getMemoryUsage(agentId: string): Promise<MemoryUsageMetric> {
    return { agentId, writeCount: this.memoryWriteCounts.get(agentId) ?? 0 };
  }

  async recordCost(agentId: string, amount: number, currency: string): Promise<void> {
    const acc = this.costAccumulators.get(agentId) ?? { totalAmount: 0, currency: null, entryCount: 0 };
    if (acc.currency && acc.currency !== currency) {
      throw new CurrencyMismatchError(agentId, acc.currency, currency);
    }
    acc.totalAmount += amount;
    acc.currency = currency;
    acc.entryCount += 1;
    this.costAccumulators.set(agentId, acc);
  }

  async getCostSummary(agentId: string): Promise<CostSummary> {
    const acc = this.costAccumulators.get(agentId) ?? { totalAmount: 0, currency: null, entryCount: 0 };
    return { agentId, ...acc };
  }
}
