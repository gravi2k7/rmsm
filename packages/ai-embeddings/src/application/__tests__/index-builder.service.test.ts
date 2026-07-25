import { describe, it, expect, beforeEach, vi } from "vitest";
import { IndexBuilder } from "../services/index-builder.service";
import { HashEmbeddingProvider } from "../../infrastructure/hash-embedding.provider";
import { InMemoryEmbeddingCache } from "../../infrastructure/in-memory-embedding.cache";
import { InMemoryVectorIndex } from "../../infrastructure/in-memory-vector-index";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("IndexBuilder", () => {
  let provider: HashEmbeddingProvider;
  let cache: InMemoryEmbeddingCache;
  let vectorIndex: InMemoryVectorIndex;
  let events: RecordingEventPublisher;
  let builder: IndexBuilder;

  beforeEach(() => {
    provider = new HashEmbeddingProvider(16);
    cache = new InMemoryEmbeddingCache();
    vectorIndex = new InMemoryVectorIndex();
    events = new RecordingEventPublisher();
    builder = new IndexBuilder(provider, cache, vectorIndex, new FixedClock(new Date()), new SequentialIdGenerator(), events);
  });

  it("embeds and upserts items not already cached, publishing EmbeddingsComputed and IndexUpdated", async () => {
    await builder.build([
      { id: "e1", text: "cats are mammals" },
      { id: "e2", text: "dogs are mammals" },
    ]);

    expect(vectorIndex.size()).toBe(2);
    expect(cache.size()).toBe(2);
    expect(events.published.map((e) => e.kind)).toEqual(["EmbeddingsComputed", "IndexUpdated"]);
    const computed = events.published[0] as { cacheHits: number };
    expect(computed.cacheHits).toBe(0);
  });

  it("uses cached vectors instead of recomputing, reflected in cacheHits", async () => {
    const embedSpy = vi.spyOn(provider, "embed");
    await builder.build([{ id: "e1", text: "cats are mammals" }]);
    embedSpy.mockClear();

    await builder.build([{ id: "e1", text: "cats are mammals" }]);

    expect(embedSpy).not.toHaveBeenCalled();
    const computed = [...events.published].reverse().find((e) => e.kind === "EmbeddingsComputed") as { cacheHits: number } | undefined;
    expect(computed?.cacheHits).toBe(1);
  });
});
