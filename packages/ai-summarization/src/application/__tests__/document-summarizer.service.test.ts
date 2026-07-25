import { describe, it, expect } from "vitest";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { DocumentSummarizer } from "../services/document-summarizer.service";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("DocumentSummarizer", () => {
  it("delegates to RecursiveSummarizer and publishes DocumentSummarized", async () => {
    const events = new RecordingEventPublisher();
    const summarizer = new DocumentSummarizer(new HeuristicSummarizer(), new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const text = "Cat. ".repeat(100);
    const summary = await summarizer.summarize(text, { maxInputChars: 100 });

    expect(summary.length).toBeGreaterThan(0);
    expect(events.published.map((e) => e.kind)).toContain("DocumentSummarized");
  });
});
