import { DomainError } from "@rmsm/core";

export class StepHandlerNotFoundError extends DomainError {
  constructor(handlerName: string) {
    super(`No handler is registered for "${handlerName}".`, "STEP_HANDLER_NOT_FOUND");
  }
}

export class CyclicWorkflowError extends DomainError {
  constructor(workflowId: string) {
    super(`Workflow "${workflowId}" contains a cyclic step dependency.`, "CYCLIC_WORKFLOW");
  }
}

export class UnknownStepDependencyError extends DomainError {
  constructor(stepId: string, dependsOnId: string) {
    super(`Step "${stepId}" depends on unknown step "${dependsOnId}".`, "UNKNOWN_STEP_DEPENDENCY");
  }
}

export class StepTimeoutError extends DomainError {
  constructor(stepId: string, timeoutMs: number) {
    super(`Step "${stepId}" timed out after ${timeoutMs}ms.`, "STEP_TIMEOUT");
  }
}

export class WorkflowExecutionNotFoundError extends DomainError {
  constructor(executionId: string) {
    super(`Workflow execution "${executionId}" was not found.`, "WORKFLOW_EXECUTION_NOT_FOUND");
  }
}
