import { describe, it, expect } from "vitest";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { HierarchicalSummarizer } from "../services/hierarchical-summarizer.service";
import { EmptyContentError, InvalidSummarizationOptionsError } from "../../domain/errors/summarization-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("HierarchicalSummarizer", () => {
  it("builds a multi-level tree that rolls up to a single rootSummary, using @rmsm/ai-memory's real HeuristicSummarizer", async () => {
    const events = new RecordingEventPublisher();
    const summarizer = new HierarchicalSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const text = "Cat. ".repeat(200); // large enough to need multiple levels with a small chunk size
    const result = await summarizer.summarize(text, { maxChunkChars: 50, nodesPerGroup: 2 });

    expect(result.levels.length).toBeGreaterThan(1);
    expect(result.levels[0]!.length).toBeGreaterThan(1);
    expect(result.levels[result.levels.length - 1]).toHaveLength(1);
    expect(result.rootSummary).toBe(result.levels[result.levels.length - 1]![0]!.text);
    expect(events.published.every((e) => e.kind === "LevelSummarized")).toBe(true);
  });

  it("returns a single level when the text fits in one chunk", async () => {
    const summarizer = new HierarchicalSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    const result = await summarizer.summarize("One sentence. Two sentence.", { maxChunkChars: 1000 });

    expect(result.levels).toHaveLength(1);
    expect(result.levels[0]).toHaveLength(1);
  });

  it("throws EmptyContentError for empty text", async () => {
    const summarizer = new HierarchicalSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    await expect(summarizer.summarize("   ", { maxChunkChars: 100 })).rejects.toThrow(EmptyContentError);
  });

  it("throws InvalidSummarizationOptionsError for nodesPerGroup < 2", async () => {
    const summarizer = new HierarchicalSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    await expect(summarizer.summarize("some text here", { maxChunkChars: 100, nodesPerGroup: 1 })).rejects.toThrow(InvalidSummarizationOptionsError);
  });
});
