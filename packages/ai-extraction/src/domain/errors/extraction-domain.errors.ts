import { DomainError } from "@rmsm/core";

export class NoJsonFoundError extends DomainError {
  constructor() {
    super("No JSON object or array was found in the input text.", "NO_JSON_FOUND");
  }
}

export class NoTableFoundError extends DomainError {
  constructor() {
    super("No table was found in the input text.", "NO_TABLE_FOUND");
  }
}

export class SchemaValidationError extends DomainError {
  constructor(schemaName: string, issues: readonly string[]) {
    super(`Extracted data did not match schema "${schemaName}": ${issues.join("; ")}`, "SCHEMA_VALIDATION_FAILED");
  }
}

export class InvalidFieldMappingError extends DomainError {
  constructor(reason: string) {
    super(`Invalid field mapping: ${reason}`, "INVALID_FIELD_MAPPING");
  }
}
