// AI-405: Multi-Agent Orchestration — coordinator/worker roles,
// delegation with failure recovery, shared context, agent messaging,
// and a consensus abstraction. Orchestrates AI-401 agents; never
// reimplements agent execution (see AgentRuntimeWorkerExecutor).

export { DelegationStatus, DELEGATION_STATUSES } from "./domain/enums/orchestration.enum";

export type { WorkerAgentDescriptor } from "./domain/entities/worker-agent-descriptor.entity";
export type { WorkerExecutionResult } from "./domain/entities/worker-execution-result.entity";
export type { DelegationTask } from "./domain/entities/delegation-task.entity";
export type { AgentMessage } from "./domain/entities/agent-message.entity";
export type { ConsensusProposal, ConsensusResult } from "./domain/entities/consensus.entity";

export {
  DuplicateWorkerError,
  WorkerNotFoundError,
  NoEligibleWorkerError,
  DelegationNotFoundError,
} from "./domain/errors/orchestration-domain.errors";

export type { WorkerRegistry } from "./repositories/worker-registry.interface";
export type { DelegationRepository } from "./repositories/delegation-repository.interface";
export type { WorkerExecutor } from "./repositories/worker-executor.interface";
export type { SharedContextStore } from "./repositories/shared-context-store.interface";
export type { MessageBus, AgentMessageHandler } from "./repositories/message-bus.interface";
export type { ConsensusStrategy } from "./repositories/consensus-strategy.interface";

export type {
  OrchestrationDomainEvent,
  WorkerRegisteredEvent,
  TaskDelegatedEvent,
  DelegationCompletedEvent,
  DelegationFailedEvent,
  DelegationReassignedEvent,
  ContextSharedEvent,
  AgentMessageSentEvent,
  ConsensusReachedEvent,
} from "./events/orchestration-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { WorkerRegistryService } from "./application/services/worker-registry.service";
export { DelegationService } from "./application/services/delegation.service";
export { SharedContextService } from "./application/services/shared-context.service";
export { MessagingService } from "./application/services/messaging.service";
export { ConsensusService } from "./application/services/consensus.service";

export { InMemoryWorkerRegistry } from "./infrastructure/in-memory-worker.registry";
export { InMemoryDelegationRepository } from "./infrastructure/in-memory-delegation.repository";
export { InMemorySharedContextStore } from "./infrastructure/in-memory-shared-context.store";
export { InMemoryMessageBus } from "./infrastructure/in-memory-message.bus";
export { MajorityConsensusStrategy } from "./infrastructure/majority-consensus.strategy";
export { AgentRuntimeWorkerExecutor } from "./infrastructure/agent-runtime-worker.executor";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
