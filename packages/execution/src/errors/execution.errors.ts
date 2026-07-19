import { DomainError } from "@rmsm/core";

export abstract class ExecutionDomainError extends DomainError {}

export class InvalidOrderError extends ExecutionDomainError {
  constructor(reason: string) {
    super(`Invalid order: ${reason}`, "INVALID_ORDER");
  }
}

export class InvalidOrderTransitionError extends ExecutionDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Order cannot transition from "${fromStatus}" to "${toStatus}".`, "INVALID_ORDER_TRANSITION");
  }
}

export class InvalidFillError extends ExecutionDomainError {
  constructor(reason: string) {
    super(`Invalid fill: ${reason}`, "INVALID_FILL");
  }
}

export class InvalidExecutionError extends ExecutionDomainError {
  constructor(reason: string) {
    super(`Invalid execution: ${reason}`, "INVALID_EXECUTION");
  }
}

export class InvalidExecutionPlanError extends ExecutionDomainError {
  constructor(reason: string) {
    super(`Invalid execution plan: ${reason}`, "INVALID_EXECUTION_PLAN");
  }
}

export class UnknownOrderError extends ExecutionDomainError {
  constructor(orderId: string) {
    super(`Order "${orderId}" is not known.`, "UNKNOWN_ORDER");
  }
}

export class UnknownExecutionError extends ExecutionDomainError {
  constructor(executionId: string) {
    super(`Execution "${executionId}" is not known.`, "UNKNOWN_EXECUTION");
  }
}

export class OrderRoutingError extends ExecutionDomainError {
  constructor(reason: string) {
    super(`Order routing failed: ${reason}`, "ORDER_ROUTING_FAILED");
  }
}
