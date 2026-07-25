import { describe, it, expect } from "vitest";
import { EmptyIndexError, InvalidRetrievalQueryError } from "../errors/rag-domain.errors";

describe("rag domain errors", () => {
  it("EmptyIndexError carries a stable code", () => {
    expect(new EmptyIndexError().code).toBe("EMPTY_INDEX");
  });
  it("InvalidRetrievalQueryError carries a stable code", () => {
    expect(new InvalidRetrievalQueryError("bad").code).toBe("INVALID_RETRIEVAL_QUERY");
  });
});
