import { DomainError } from "@rmsm/core";

export class EmptyContentError extends DomainError {
  constructor() {
    super("Cannot summarize empty content.", "EMPTY_CONTENT");
  }
}

export class InvalidSummarizationOptionsError extends DomainError {
  constructor(reason: string) {
    super(`Invalid summarization options: ${reason}`, "INVALID_SUMMARIZATION_OPTIONS");
  }
}

export class SummarizationDidNotConvergeError extends DomainError {
  constructor(maxRounds: number) {
    super(`Recursive summarization did not converge within ${maxRounds} rounds.`, "SUMMARIZATION_DID_NOT_CONVERGE");
  }
}
