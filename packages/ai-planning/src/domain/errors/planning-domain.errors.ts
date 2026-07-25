import { DomainError } from "@rmsm/core";

export class EmptyGoalError extends DomainError {
  constructor() {
    super("Goal description must not be empty.", "EMPTY_GOAL");
  }
}

export class DuplicateTaskIdError extends DomainError {
  constructor(taskId: string) {
    super(`Task id is duplicated within the plan: ${taskId}`, "DUPLICATE_TASK_ID");
  }
}

export class UnknownDependencyError extends DomainError {
  constructor(taskId: string, dependencyId: string) {
    super(`Task "${taskId}" depends on unknown task "${dependencyId}".`, "UNKNOWN_DEPENDENCY");
  }
}

export class CyclicDependencyError extends DomainError {
  constructor(cycle: readonly string[]) {
    super(`Cyclic dependency detected among tasks: ${cycle.join(" -> ")}`, "CYCLIC_DEPENDENCY");
  }
}

export class PlanNotFoundError extends DomainError {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`, "PLAN_NOT_FOUND");
  }
}

export class TaskNotFoundError extends DomainError {
  constructor(planId: string, taskId: string) {
    super(`Task "${taskId}" not found on plan "${planId}".`, "TASK_NOT_FOUND");
  }
}

export class InvalidPlanError extends DomainError {
  constructor(reasons: readonly string[]) {
    super(`Plan failed validation: ${reasons.join("; ")}`, "INVALID_PLAN");
  }
}
