import { DomainError } from "@rmsm/core";

export class RunNotFoundError extends DomainError {
  constructor(runId: string) {
    super(`Workflow run not found: ${runId}`, "RUN_NOT_FOUND");
  }
}

export class RunNotRetryableError extends DomainError {
  constructor(runId: string, status: string) {
    super(`Workflow run "${runId}" cannot be retried from status ${status}.`, "RUN_NOT_RETRYABLE");
  }
}
