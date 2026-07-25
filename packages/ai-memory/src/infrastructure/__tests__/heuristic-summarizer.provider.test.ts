import { describe, it, expect } from "vitest";
import { HeuristicSummarizer } from "../heuristic-summarizer.provider";

describe("HeuristicSummarizer", () => {
  const summarizer = new HeuristicSummarizer();

  it("returns up to the default 3 sentences", async () => {
    const text = "First sentence. Second sentence. Third sentence. Fourth sentence.";
    const result = await summarizer.summarize(text);
    expect(result).toBe("First sentence. Second sentence. Third sentence.");
  });

  it("respects a custom targetSentences", async () => {
    const text = "First sentence. Second sentence. Third sentence.";
    const result = await summarizer.summarize(text, 1);
    expect(result).toBe("First sentence.");
  });

  it("returns the whole text when it has fewer sentences than requested", async () => {
    const text = "Only one sentence.";
    const result = await summarizer.summarize(text, 3);
    expect(result).toBe("Only one sentence.");
  });
});
