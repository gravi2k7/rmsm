import { describe, it, expect } from "vitest";
import { NoJsonFoundError, NoTableFoundError, SchemaValidationError, InvalidFieldMappingError } from "../errors/extraction-domain.errors";

describe("extraction domain errors", () => {
  it("NoJsonFoundError carries a stable code", () => {
    expect(new NoJsonFoundError().code).toBe("NO_JSON_FOUND");
  });
  it("NoTableFoundError carries a stable code", () => {
    expect(new NoTableFoundError().code).toBe("NO_TABLE_FOUND");
  });
  it("SchemaValidationError carries a stable code and lists issues", () => {
    const error = new SchemaValidationError("Person", ["name: required"]);
    expect(error.code).toBe("SCHEMA_VALIDATION_FAILED");
    expect(error.message).toContain("name: required");
  });
  it("InvalidFieldMappingError carries a stable code", () => {
    expect(new InvalidFieldMappingError("missing field").code).toBe("INVALID_FIELD_MAPPING");
  });
});
