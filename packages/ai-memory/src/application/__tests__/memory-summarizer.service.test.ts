import { describe, it, expect } from "vitest";
import { MemorySummarizer } from "../services/memory-summarizer.service";
import { MemoryType } from "../../domain/enums/memory-type.enum";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";
import { FakeSummarizer, RecordingEventPublisher, FixedClock, SequentialIdGenerator } from "./fakes";

function makeEntry(id: string, content: string): MemoryEntry {
  return {
    id,
    conversationId: "conv-1",
    organizationId: null,
    type: MemoryType.CONVERSATION,
    content,
    metadata: { id, tags: [], source: "test", author: "test", version: 1 },
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: null,
  };
}

describe("MemorySummarizer", () => {
  it("delegates to the injected Summarizer and raises MemorySummarized", async () => {
    const events = new RecordingEventPublisher();
    const now = new Date("2026-01-01T00:00:00Z");
    const summarizer = new MemorySummarizer(new FakeSummarizer(), events, new FixedClock(now), new SequentialIdGenerator());

    const entries = [makeEntry("e1", "First fact. Second fact."), makeEntry("e2", "Third fact.")];
    const summary = await summarizer.summarize({ conversationId: "conv-1", sourceEntries: entries, targetSentences: 1 });

    expect(summary.conversationId).toBe("conv-1");
    expect(summary.sourceMemoryEntryIds).toEqual(["e1", "e2"]);
    expect(summary.createdAt).toEqual(now);
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({ kind: "MemorySummarized", sourceMemoryEntryIds: ["e1", "e2"] });
  });

  it("throws for an empty sourceEntries array", async () => {
    const summarizer = new MemorySummarizer(new FakeSummarizer());
    await expect(summarizer.summarize({ conversationId: null, sourceEntries: [] })).rejects.toThrow();
  });
});
