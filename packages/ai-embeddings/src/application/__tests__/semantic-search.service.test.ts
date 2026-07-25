import { describe, it, expect, beforeEach } from "vitest";
import { IndexBuilder } from "../services/index-builder.service";
import { SemanticSearchService } from "../services/semantic-search.service";
import { HashEmbeddingProvider } from "../../infrastructure/hash-embedding.provider";
import { InMemoryEmbeddingCache } from "../../infrastructure/in-memory-embedding.cache";
import { InMemoryVectorIndex } from "../../infrastructure/in-memory-vector-index";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("SemanticSearchService", () => {
  let searchService: SemanticSearchService;
  let events: RecordingEventPublisher;

  beforeEach(async () => {
    const provider = new HashEmbeddingProvider(16);
    const cache = new InMemoryEmbeddingCache();
    const vectorIndex = new InMemoryVectorIndex();
    events = new RecordingEventPublisher();

    const builder = new IndexBuilder(provider, cache, vectorIndex, new FixedClock(new Date()), new SequentialIdGenerator());
    await builder.build([
      { id: "cats", text: "cats are small furry mammals" },
      { id: "dogs", text: "dogs are loyal furry mammals" },
      { id: "market", text: "the stock market crashed today" },
    ]);

    searchService = new SemanticSearchService(provider, cache, vectorIndex, new FixedClock(new Date()), new SequentialIdGenerator(), events);
  });

  it("finds the most semantically similar indexed entries and publishes SemanticSearchCompleted", async () => {
    const results = await searchService.search("furry mammals", 2);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.entry.id)).not.toContain("market");
    expect(events.published.map((e) => e.kind)).toEqual(["SemanticSearchCompleted"]);
  });
});
