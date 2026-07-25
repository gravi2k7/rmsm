import { DomainError } from "@rmsm/core";

export class EmptyTextError extends DomainError {
  constructor() {
    super("Cannot embed empty text.", "EMPTY_TEXT");
  }
}

export class EmbeddingDimensionMismatchError extends DomainError {
  constructor(expected: number, actual: number) {
    super(`Expected an embedding of ${expected} dimensions, got ${actual}.`, "EMBEDDING_DIMENSION_MISMATCH");
  }
}

export class IndexEntryNotFoundError extends DomainError {
  constructor(id: string) {
    super(`Index entry "${id}" was not found.`, "INDEX_ENTRY_NOT_FOUND");
  }
}
