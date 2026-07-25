import { describe, it, expect } from "vitest";
import { estimateTokenCount } from "@rmsm/ai-memory";
import { ContextBuilder } from "../services/context-builder.service";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";
import type { RetrievalResult } from "../../domain/entities/retrieval-result.entity";

describe("ContextBuilder", () => {
  it("assembles ranked results into contextText, greedily filling the token budget using @rmsm/ai-memory's real estimateTokenCount", async () => {
    const events = new RecordingEventPublisher();
    const builder = new ContextBuilder(new FixedClock(new Date()), new SequentialIdGenerator(), events);

    const results: readonly RetrievalResult[] = [
      { chunk: { id: "c1", text: "short chunk" }, score: 0.9 },
      { chunk: { id: "c2", text: "another reasonably short chunk of text" }, score: 0.5 },
    ];
    const budget = estimateTokenCount(results[0]!.chunk.text) + 1; // only room for the first chunk

    const context = await builder.build(results, budget);

    expect(context.usedResults.map((r) => r.chunk.id)).toEqual(["c1"]);
    expect(context.truncated).toBe(true);
    expect(context.contextText).toBe("short chunk");
    expect(events.published.map((e) => e.kind)).toEqual(["ContextBuilt"]);
  });

  it("includes every result when the budget is large enough, and truncated is false", async () => {
    const builder = new ContextBuilder(new FixedClock(new Date()), new SequentialIdGenerator());
    const results: readonly RetrievalResult[] = [
      { chunk: { id: "c1", text: "a" }, score: 1 },
      { chunk: { id: "c2", text: "b" }, score: 0.5 },
    ];

    const context = await builder.build(results, 1000);

    expect(context.usedResults).toHaveLength(2);
    expect(context.truncated).toBe(false);
  });
});
