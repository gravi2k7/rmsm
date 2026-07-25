import { describe, it, expect } from "vitest";
import { splitIntoChunks } from "../services/text-chunker.util";
import { InvalidSummarizationOptionsError } from "../../domain/errors/summarization-domain.errors";

describe("splitIntoChunks", () => {
  it("splits text into fixed-size chunks", () => {
    expect(splitIntoChunks("abcdefgh", 3)).toEqual(["abc", "def", "gh"]);
  });

  it("throws InvalidSummarizationOptionsError for a non-positive size", () => {
    expect(() => splitIntoChunks("abc", 0)).toThrow(InvalidSummarizationOptionsError);
  });
});
