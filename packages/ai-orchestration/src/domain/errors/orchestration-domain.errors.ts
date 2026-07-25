import { DomainError } from "@rmsm/core";

export class DuplicateWorkerError extends DomainError {
  constructor(agentId: string) {
    super(`Worker already registered: ${agentId}`, "DUPLICATE_WORKER");
  }
}

export class WorkerNotFoundError extends DomainError {
  constructor(agentId: string) {
    super(`Worker not found: ${agentId}`, "WORKER_NOT_FOUND");
  }
}

export class NoEligibleWorkerError extends DomainError {
  constructor(capability: string) {
    super(`No eligible worker found for capability: ${capability}`, "NO_ELIGIBLE_WORKER");
  }
}

export class DelegationNotFoundError extends DomainError {
  constructor(delegationId: string) {
    super(`Delegation not found: ${delegationId}`, "DELEGATION_NOT_FOUND");
  }
}
