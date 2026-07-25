import type { DomainEvent } from "@rmsm/core";

export interface AgentRunRecordedEvent extends DomainEvent {
  readonly kind: "AgentRunRecorded";
  readonly agentId: string;
}

export interface ToolUsageRecordedEvent extends DomainEvent {
  readonly kind: "ToolUsageRecorded";
  readonly toolName: string;
}

export interface PlanningMetricRecordedEvent extends DomainEvent {
  readonly kind: "PlanningMetricRecorded";
}

export interface WorkflowMetricRecordedEvent extends DomainEvent {
  readonly kind: "WorkflowMetricRecorded";
}

export interface MemoryUsageRecordedEvent extends DomainEvent {
  readonly kind: "MemoryUsageRecorded";
  readonly agentId: string;
}

export interface CostRecordedEvent extends DomainEvent {
  readonly kind: "CostRecorded";
  readonly agentId: string;
  readonly amount: number;
}

export type AgentAnalyticsDomainEvent =
  | AgentRunRecordedEvent
  | ToolUsageRecordedEvent
  | PlanningMetricRecordedEvent
  | WorkflowMetricRecordedEvent
  | MemoryUsageRecordedEvent
  | CostRecordedEvent;
