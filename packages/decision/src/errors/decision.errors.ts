import { DomainError } from "@rmsm/core";

export abstract class DecisionDomainError extends DomainError {}

export class InvalidDecisionError extends DecisionDomainError {
  constructor(reason: string) {
    super(`Invalid decision: ${reason}`, "INVALID_DECISION");
  }
}

export class InvalidRiskAssessmentError extends DecisionDomainError {
  constructor(reason: string) {
    super(`Invalid risk assessment: ${reason}`, "INVALID_RISK_ASSESSMENT");
  }
}

export class InvalidApprovalError extends DecisionDomainError {
  constructor(reason: string) {
    super(`Invalid approval: ${reason}`, "INVALID_APPROVAL");
  }
}

export class InvalidPositionSizeError extends DecisionDomainError {
  constructor(reason: string) {
    super(`Invalid position size: ${reason}`, "INVALID_POSITION_SIZE");
  }
}

export class UnknownDecisionError extends DecisionDomainError {
  constructor(decisionId: string) {
    super(`Decision "${decisionId}" is not known.`, "UNKNOWN_DECISION");
  }
}

export class InvalidDecisionTransitionError extends DecisionDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Decision cannot transition from "${fromStatus}" to "${toStatus}".`, "INVALID_DECISION_TRANSITION");
  }
}
