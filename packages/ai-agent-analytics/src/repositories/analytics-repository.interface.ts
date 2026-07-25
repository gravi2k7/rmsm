import type { AgentRunOutcome, ToolOutcome, WorkflowRunOutcome } from "../domain/enums/analytics.enum";
import type { AgentMetricsSummary } from "../domain/entities/agent-metrics-summary.entity";
import type { ToolUsageMetric } from "../domain/entities/tool-usage-metric.entity";
import type { PlanningMetric } from "../domain/entities/planning-metric.entity";
import type { WorkflowRunMetric } from "../domain/entities/workflow-run-metric.entity";
import type { MemoryUsageMetric } from "../domain/entities/memory-usage-metric.entity";
import type { CostSummary } from "../domain/entities/cost-summary.entity";

/**
 * A single consolidated port for every AI-410 metric category. One
 * port rather than six mirrors how a real metrics store works — it
 * maintains running aggregates (sums/counts), not a raw event log — and
 * keeps the six capabilities' storage concerns in one place, since
 * they share nothing dimension-wise that would justify six separate
 * repository files.
 */
export interface AnalyticsRepository {
  recordAgentRun(agentId: string, outcome: AgentRunOutcome, durationMs: number): Promise<void>;
  getAgentSummary(agentId: string): Promise<AgentMetricsSummary>;

  recordToolInvocation(toolName: string): Promise<void>;
  recordToolOutcome(toolName: string, outcome: ToolOutcome): Promise<void>;
  getToolUsage(toolName: string): Promise<ToolUsageMetric>;

  recordPlanCreated(): Promise<void>;
  recordPlanValidated(valid: boolean): Promise<void>;
  recordReplanned(): Promise<void>;
  getPlanningMetrics(): Promise<PlanningMetric>;

  recordWorkflowRunTerminal(outcome: WorkflowRunOutcome): Promise<void>;
  getWorkflowMetrics(): Promise<WorkflowRunMetric>;

  recordMemoryWrite(agentId: string): Promise<void>;
  getMemoryUsage(agentId: string): Promise<MemoryUsageMetric>;

  recordCost(agentId: string, amount: number, currency: string): Promise<void>;
  getCostSummary(agentId: string): Promise<CostSummary>;
}
