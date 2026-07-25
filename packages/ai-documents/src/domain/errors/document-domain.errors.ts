import { DomainError } from "@rmsm/core";

export class UnsupportedDocumentTypeError extends DomainError {
  constructor(type: string) {
    super(`No parser is registered for document type "${type}".`, "UNSUPPORTED_DOCUMENT_TYPE");
  }
}

export class DocumentParseError extends DomainError {
  constructor(sourceId: string, reason: string) {
    super(`Failed to parse document "${sourceId}": ${reason}`, "DOCUMENT_PARSE_FAILED");
  }
}

export class EmptyDocumentError extends DomainError {
  constructor(sourceId: string) {
    super(`Document "${sourceId}" contains no extractable text.`, "EMPTY_DOCUMENT");
  }
}

export class InvalidChunkOptionsError extends DomainError {
  constructor(reason: string) {
    super(`Invalid chunk options: ${reason}`, "INVALID_CHUNK_OPTIONS");
  }
}
