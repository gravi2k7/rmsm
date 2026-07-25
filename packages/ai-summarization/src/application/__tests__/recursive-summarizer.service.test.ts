import { describe, it, expect } from "vitest";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { RecursiveSummarizer } from "../services/recursive-summarizer.service";
import { EmptyContentError, SummarizationDidNotConvergeError } from "../../domain/errors/summarization-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("RecursiveSummarizer", () => {
  it("chunks, summarizes each chunk with @rmsm/ai-memory's real HeuristicSummarizer, and converges under the budget", async () => {
    const events = new RecordingEventPublisher();
    const summarizer = new RecursiveSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const text = "Cat. ".repeat(100); // 500 chars, many short "sentences"
    const result = await summarizer.summarize(text, { maxInputChars: 100 });

    expect(result.summary.length).toBeLessThan(text.length);
    expect(result.roundsUsed).toBeGreaterThanOrEqual(1);
    expect(events.published.some((e) => e.kind === "RecursiveSummarizationCompleted")).toBe(true);
  });

  it("still runs a single summarization pass when the text is already under budget", async () => {
    const summarizer = new RecursiveSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    const text = "One sentence. Two sentence. Three sentence. Four sentence.";

    const result = await summarizer.summarize(text, { maxInputChars: 1000 });

    expect(result.roundsUsed).toBe(1);
  });

  it("throws EmptyContentError for empty text", async () => {
    const summarizer = new RecursiveSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    await expect(summarizer.summarize("   ", { maxInputChars: 100 })).rejects.toThrow(EmptyContentError);
  });

  it("throws SummarizationDidNotConvergeError when chunks never shrink within maxRounds", async () => {
    const summarizer = new RecursiveSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator());
    const text = "abcdefghijklmnopqrstuvwxyz".repeat(3); // no sentence boundaries at all

    await expect(summarizer.summarize(text, { maxInputChars: 10, maxRounds: 2 })).rejects.toThrow(SummarizationDidNotConvergeError);
  });
});
