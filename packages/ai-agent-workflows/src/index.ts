// AI-406: Workflow Automation — long-running execution, pollable
// workflow state, event-driven checkpointing, workflow-level retry,
// cancellation, and a scheduling abstraction, all layered on top of
// AI-310's WorkflowEngine without reimplementing any of its DAG,
// per-step retry, timeout, or cancellation logic. "Agents may execute
// workflows" via createWorkflowStepFn, an AI-401-compatible step
// function.

export { RunStatus, RUN_STATUSES } from "./domain/enums/run.enum";
export type { WorkflowRunState } from "./domain/entities/workflow-run-state.entity";
export { RunNotFoundError, RunNotRetryableError } from "./domain/errors/agent-workflow-domain.errors";

export type { CheckpointRepository } from "./repositories/checkpoint-repository.interface";
export type { WorkflowScheduler } from "./repositories/workflow-scheduler.interface";

export type {
  AgentWorkflowDomainEvent,
  WorkflowRunStartedEvent,
  WorkflowCheckpointedEvent,
  WorkflowRunCompletedEvent,
  WorkflowRunFailedEvent,
  WorkflowRunCancelledEvent,
  WorkflowRunRetriedEvent,
} from "./events/agent-workflow-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { AgentWorkflowRunner } from "./application/services/agent-workflow-runner.service";
export { createWorkflowStepFn } from "./application/services/agent-workflow-step.adapter";

export { InMemoryCheckpointRepository } from "./infrastructure/in-memory-checkpoint.repository";
export { RunIdSeededIdGenerator } from "./infrastructure/run-id-seeded-id.generator";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
