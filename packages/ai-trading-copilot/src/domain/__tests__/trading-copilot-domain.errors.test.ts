import { describe, expect, it } from "vitest";
import { UnroutableQuestionError } from "../errors/trading-copilot-domain.errors";

describe("trading-copilot domain errors", () => {
  it("UnroutableQuestionError carries the UNROUTABLE_QUESTION code", () => {
    expect(new UnroutableQuestionError("test question").code).toBe("UNROUTABLE_QUESTION");
  });
});
