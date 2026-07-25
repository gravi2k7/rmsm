// AI-410: Agent Analytics — agent metrics, success/failure rate,
// execution duration, planning metrics, tool usage, workflow metrics,
// memory usage, cost metrics, and observability integration.
// AgentMetricsTracingAdapter observes AI-401 without AI-401 depending
// back; AgentMetricsService optionally forwards into AI-204's own
// unmodified AuditService.

export { AgentRunOutcome, AGENT_RUN_OUTCOMES, ToolOutcome, TOOL_OUTCOMES, WorkflowRunOutcome, WORKFLOW_RUN_OUTCOMES } from "./domain/enums/analytics.enum";

export type { AgentMetricsSummary } from "./domain/entities/agent-metrics-summary.entity";
export type { ToolUsageMetric } from "./domain/entities/tool-usage-metric.entity";
export type { PlanningMetric } from "./domain/entities/planning-metric.entity";
export type { WorkflowRunMetric } from "./domain/entities/workflow-run-metric.entity";
export type { MemoryUsageMetric } from "./domain/entities/memory-usage-metric.entity";
export type { CostSummary } from "./domain/entities/cost-summary.entity";

export { NegativeDurationError, NegativeCostAmountError, CurrencyMismatchError } from "./domain/errors/agent-analytics-domain.errors";

export type { AnalyticsRepository } from "./repositories/analytics-repository.interface";

export type {
  AgentAnalyticsDomainEvent,
  AgentRunRecordedEvent,
  ToolUsageRecordedEvent,
  PlanningMetricRecordedEvent,
  WorkflowMetricRecordedEvent,
  MemoryUsageRecordedEvent,
  CostRecordedEvent,
} from "./events/agent-analytics-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { AgentMetricsService } from "./application/services/agent-metrics.service";
export { ToolUsageService } from "./application/services/tool-usage.service";
export { PlanningMetricsService } from "./application/services/planning-metrics.service";
export { WorkflowMetricsService } from "./application/services/workflow-metrics.service";
export { MemoryUsageService } from "./application/services/memory-usage.service";
export { CostMetricsService } from "./application/services/cost-metrics.service";

export { InMemoryAnalyticsRepository } from "./infrastructure/in-memory-analytics.repository";
export { AgentMetricsTracingAdapter } from "./infrastructure/agent-metrics-tracing.adapter";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
