import { describe, it, expect } from "vitest";
import { EmptyContentError, InvalidSummarizationOptionsError, SummarizationDidNotConvergeError } from "../errors/summarization-domain.errors";

describe("summarization domain errors", () => {
  it("EmptyContentError carries a stable code", () => {
    expect(new EmptyContentError().code).toBe("EMPTY_CONTENT");
  });
  it("InvalidSummarizationOptionsError carries a stable code", () => {
    expect(new InvalidSummarizationOptionsError("bad").code).toBe("INVALID_SUMMARIZATION_OPTIONS");
  });
  it("SummarizationDidNotConvergeError carries a stable code", () => {
    expect(new SummarizationDidNotConvergeError(5).code).toBe("SUMMARIZATION_DID_NOT_CONVERGE");
  });
});
