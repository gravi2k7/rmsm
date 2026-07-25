import { describe, it, expect } from "vitest";
import { EmptyTextError, EmbeddingDimensionMismatchError, IndexEntryNotFoundError } from "../errors/embedding-domain.errors";

describe("embedding domain errors", () => {
  it("EmptyTextError carries a stable code", () => {
    expect(new EmptyTextError().code).toBe("EMPTY_TEXT");
  });
  it("EmbeddingDimensionMismatchError carries a stable code and both dimensions", () => {
    const error = new EmbeddingDimensionMismatchError(32, 16);
    expect(error.code).toBe("EMBEDDING_DIMENSION_MISMATCH");
    expect(error.message).toContain("32");
    expect(error.message).toContain("16");
  });
  it("IndexEntryNotFoundError carries a stable code", () => {
    expect(new IndexEntryNotFoundError("e1").code).toBe("INDEX_ENTRY_NOT_FOUND");
  });
});
