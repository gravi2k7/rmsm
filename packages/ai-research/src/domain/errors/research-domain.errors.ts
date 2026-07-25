import { DomainError } from "@rmsm/core";

export class ResearchPlanNotFoundError extends DomainError {
  constructor(planId: string) {
    super(`Research plan "${planId}" was not found.`, "RESEARCH_PLAN_NOT_FOUND");
  }
}

export class NoEvidenceFoundError extends DomainError {
  constructor(stepId: string) {
    super(`No evidence was found for research step "${stepId}".`, "NO_EVIDENCE_FOUND");
  }
}

export class InvalidResearchQueryError extends DomainError {
  constructor(reason: string) {
    super(`Invalid research query: ${reason}`, "INVALID_RESEARCH_QUERY");
  }
}
