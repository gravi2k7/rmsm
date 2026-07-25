import { DomainError } from "@rmsm/core";

export class EmptyIndexError extends DomainError {
  constructor() {
    super("The retrieval index contains no chunks.", "EMPTY_INDEX");
  }
}

export class InvalidRetrievalQueryError extends DomainError {
  constructor(reason: string) {
    super(`Invalid retrieval query: ${reason}`, "INVALID_RETRIEVAL_QUERY");
  }
}
