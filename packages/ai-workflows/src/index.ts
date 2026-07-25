// @rmsm/ai-workflows public API (AI-310 AI Workflow Engine)

// Domain: enums
export { StepStatus, STEP_STATUSES, WorkflowStatus, WORKFLOW_STATUSES } from "./domain/enums/workflow.enum";

// Domain: entities
export type { WorkflowContext } from "./domain/entities/workflow-context.entity";
export type { RetryPolicy } from "./domain/entities/retry-policy.entity";
export type { StepDefinition } from "./domain/entities/step-definition.entity";
export type { WorkflowDefinition } from "./domain/entities/workflow-definition.entity";
export type { StepResult } from "./domain/entities/step-result.entity";
export type { WorkflowExecution } from "./domain/entities/workflow-execution.entity";

// Domain: errors
export {
  StepHandlerNotFoundError,
  CyclicWorkflowError,
  UnknownStepDependencyError,
  StepTimeoutError,
  WorkflowExecutionNotFoundError,
} from "./domain/errors/workflow-domain.errors";

// Ports
export type { StepHandler, StepHandlerRegistry } from "./repositories/step-handler-registry.interface";
export type { WorkflowExecutionRepository } from "./repositories/workflow-execution-repository.interface";
export type { CancellationToken } from "./repositories/cancellation-token.interface";

// Events
export type {
  WorkflowStartedEvent,
  StepStartedEvent,
  StepRetriedEvent,
  StepSucceededEvent,
  StepFailedEvent,
  StepSkippedEvent,
  StepTimedOutEvent,
  WorkflowCompletedEvent,
  WorkflowFailedEvent,
  WorkflowCancelledEvent,
  WorkflowDomainEvent,
} from "./events/workflow-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { WorkflowEngine } from "./application/services/workflow-engine.service";

// Infrastructure
export { SimpleCancellationToken } from "./infrastructure/simple-cancellation.token";
export { DefaultStepHandlerRegistry } from "./infrastructure/default-step-handler.registry";
export { InMemoryWorkflowExecutionRepository } from "./infrastructure/in-memory-workflow-execution.repository";
export { InMemoryEventPublisher, type WorkflowEventListener } from "./infrastructure/in-memory-event-publisher";
