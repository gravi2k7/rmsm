import { describe, it, expect, beforeEach } from "vitest";
import { MemoryRetriever } from "../services/memory-retriever.service";
import { MemoryService } from "../services/memory.service";
import { InvalidMemoryQueryError } from "../../domain/errors/memory-domain.errors";
import { MemoryType } from "../../domain/enums/memory-type.enum";
import { FakeMemoryRepository, RecordingEventPublisher, FixedClock, SequentialIdGenerator } from "./fakes";

describe("MemoryRetriever", () => {
  let repository: FakeMemoryRepository;
  let events: RecordingEventPublisher;
  let memoryService: MemoryService;
  let retriever: MemoryRetriever;
  const now = new Date("2026-01-01T00:00:00Z");

  beforeEach(() => {
    repository = new FakeMemoryRepository();
    events = new RecordingEventPublisher();
    memoryService = new MemoryService(repository, undefined, new FixedClock(now), new SequentialIdGenerator());
    retriever = new MemoryRetriever(repository, events, new FixedClock(now), new SequentialIdGenerator());
  });

  it("rejects a non-positive limit", async () => {
    await expect(retriever.retrieve({ limit: 0 })).rejects.toBeInstanceOf(InvalidMemoryQueryError);
  });

  it("retrieves entries matching the query and raises MemoryRetrieved", async () => {
    await memoryService.store({ type: MemoryType.SEMANTIC, content: "Mumbai office details", metadata: { tags: ["office"], source: "t", author: "t" } });
    await memoryService.store({ type: MemoryType.SEMANTIC, content: "unrelated", metadata: { tags: [], source: "t", author: "t" } });

    const result = await retriever.retrieve({ searchText: "mumbai" });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]?.content).toContain("Mumbai");
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({ kind: "MemoryRetrieved", searchText: "mumbai" });
  });

  it("does not raise MemoryRetrieved when nothing matches", async () => {
    const result = await retriever.retrieve({ searchText: "nothing-matches-this" });
    expect(result.entries).toHaveLength(0);
    expect(events.published).toHaveLength(0);
  });
});
