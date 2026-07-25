// AI-404: Planning Engine — goal decomposition, task-graph dependency
// resolution, execution planning, reflection, re-planning, parallel
// planning, and plan validation. No dependency on any AI-2xx/3xx memory,
// retrieval, or generation package; depends on @rmsm/core plus
// @rmsm/ai-agents solely for the AgentGoal type consumed by
// PlanningService.createPlanForGoal().

export { PlanStatus, PLAN_STATUSES, TaskStatus, TASK_STATUSES } from "./domain/enums/planning.enum";

export type { PlanTask, PlanTaskDraft } from "./domain/entities/plan-task.entity";
export type { ExecutionPlan } from "./domain/entities/execution-plan.entity";
export type { PlanValidationResult } from "./domain/entities/plan-validation-result.entity";
export type { TaskExecutionOutcome } from "./domain/entities/task-execution-outcome.entity";
export type { ReflectionResult } from "./domain/entities/reflection-result.entity";
export type { TaskGraphLayers } from "./domain/entities/task-graph.entity";

export {
  EmptyGoalError,
  DuplicateTaskIdError,
  UnknownDependencyError,
  CyclicDependencyError,
  PlanNotFoundError,
  TaskNotFoundError,
  InvalidPlanError,
} from "./domain/errors/planning-domain.errors";

export type { GoalDecomposer } from "./repositories/goal-decomposer.interface";
export type { PlanRepository } from "./repositories/plan-repository.interface";

export type {
  PlanningDomainEvent,
  PlanCreatedEvent,
  PlanValidatedEvent,
  PlanReflectedEvent,
  PlanReplannedEvent,
} from "./events/planning-domain-events.interface";
export type { EventPublisher } from "./events/event-publisher.interface";

export { TaskGraphService } from "./application/services/task-graph.service";
export { PlanValidatorService } from "./application/services/plan-validator.service";
export { PlanningService } from "./application/services/planning.service";
export { PlanReflectorService } from "./application/services/plan-reflector.service";
export { RePlannerService } from "./application/services/re-planner.service";

export { SequentialGoalDecomposer } from "./infrastructure/sequential-goal.decomposer";
export { InMemoryPlanRepository } from "./infrastructure/in-memory-plan.repository";
export { InMemoryEventPublisher } from "./infrastructure/in-memory-event-publisher";
