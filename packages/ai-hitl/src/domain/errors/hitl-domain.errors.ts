import { DomainError } from "@rmsm/core";

export class ApprovalRequestNotFoundError extends DomainError {
  constructor(requestId: string) {
    super(`Approval request not found: ${requestId}`, "APPROVAL_REQUEST_NOT_FOUND");
  }
}

export class ApprovalAlreadyResolvedError extends DomainError {
  constructor(requestId: string, status: string) {
    super(`Approval request "${requestId}" is already resolved (status: ${status}).`, "APPROVAL_ALREADY_RESOLVED");
  }
}

export class InterventionNotFoundError extends DomainError {
  constructor(interventionId: string) {
    super(`Manual intervention not found: ${interventionId}`, "INTERVENTION_NOT_FOUND");
  }
}

export class InterventionAlreadyResolvedError extends DomainError {
  constructor(interventionId: string) {
    super(`Manual intervention "${interventionId}" is already resolved.`, "INTERVENTION_ALREADY_RESOLVED");
  }
}
