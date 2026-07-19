import { DomainError } from "@rmsm/core";

export abstract class OpportunityDomainError extends DomainError {}

export class InvalidOpportunityError extends OpportunityDomainError {
  constructor(reason: string) {
    super(`Invalid opportunity: ${reason}`, "INVALID_OPPORTUNITY");
  }
}

export class InvalidSignalError extends OpportunityDomainError {
  constructor(reason: string) {
    super(`Invalid signal: ${reason}`, "INVALID_SIGNAL");
  }
}

export class InvalidConfidenceError extends OpportunityDomainError {
  constructor(reason: string) {
    super(`Invalid confidence score: ${reason}`, "INVALID_CONFIDENCE");
  }
}

export class InvalidMarketContextError extends OpportunityDomainError {
  constructor(reason: string) {
    super(`Invalid market context: ${reason}`, "INVALID_MARKET_CONTEXT");
  }
}

export class UnknownOpportunityError extends OpportunityDomainError {
  constructor(opportunityId: string) {
    super(`Opportunity "${opportunityId}" is not known.`, "UNKNOWN_OPPORTUNITY");
  }
}

export class InvalidOpportunityTransitionError extends OpportunityDomainError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Opportunity cannot transition from "${fromStatus}" to "${toStatus}".`, "INVALID_OPPORTUNITY_TRANSITION");
  }
}
