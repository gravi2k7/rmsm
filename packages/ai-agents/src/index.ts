// @rmsm/ai-agents public API (AI-401 Agent Framework)

// Domain: enums
export { AgentStatus, AGENT_STATUSES, AgentExecutionMode, AGENT_EXECUTION_MODES } from "./domain/enums/agent.enum";

// Domain: entities
export type { AgentGoal } from "./domain/entities/agent-goal.entity";
export type { AgentConfig } from "./domain/entities/agent-config.entity";
export type { AgentContext } from "./domain/entities/agent-context.entity";
export type { AgentStepResult } from "./domain/entities/agent-step-result.entity";
export type { AgentExecutionState } from "./domain/entities/agent-execution-state.entity";
export type { AgentRunResult } from "./domain/entities/agent-run-result.entity";

// Domain: errors
export {
  AgentNotFoundError,
  InvalidAgentConfigError,
  ReasoningStrategyNotFoundError,
  AgentExecutionError,
  MaxStepsExceededError,
  ExecutionNotFoundError,
} from "./domain/errors/agent-domain.errors";

// Ports
export type { ReasoningStrategy, ReasoningStrategyRegistry } from "./repositories/reasoning-strategy.interface";
export type { AgentRegistry } from "./repositories/agent-registry.interface";
export type { AgentExecutionRepository } from "./repositories/agent-execution-repository.interface";
export type { CancellationToken } from "./repositories/cancellation-token.interface";

// Events
export type {
  AgentStartedEvent,
  AgentStepCompletedEvent,
  AgentCompletedEvent,
  AgentFailedEvent,
  AgentCancelledEvent,
  AgentDomainEvent,
} from "./events/agent-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

// Application
export { AgentRuntime } from "./application/services/agent-runtime.service";
export { AgentFactory } from "./application/services/agent-factory.service";

// Infrastructure
export { SequentialReasoningStrategy, type StepFn } from "./infrastructure/sequential-reasoning.strategy";
export { DefaultReasoningStrategyRegistry } from "./infrastructure/default-reasoning-strategy.registry";
export { DefaultAgentRegistry } from "./infrastructure/default-agent.registry";
export { InMemoryAgentExecutionRepository } from "./infrastructure/in-memory-agent-execution.repository";
export { SimpleCancellationToken } from "./infrastructure/simple-cancellation.token";
export { InMemoryEventPublisher, type AgentEventListener } from "./infrastructure/in-memory-event-publisher";
