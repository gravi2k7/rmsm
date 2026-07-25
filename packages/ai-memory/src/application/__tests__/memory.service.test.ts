import { describe, it, expect, beforeEach } from "vitest";
import { MemoryService } from "../services/memory.service";
import { MemoryExpiredError, MemoryNotFoundError, MemoryVersionConflictError } from "../../domain/errors/memory-domain.errors";
import { MemoryType } from "../../domain/enums/memory-type.enum";
import { FakeMemoryRepository, RecordingEventPublisher, FixedClock, SequentialIdGenerator } from "./fakes";

describe("MemoryService", () => {
  let repository: FakeMemoryRepository;
  let events: RecordingEventPublisher;
  let service: MemoryService;
  const now = new Date("2026-01-01T00:00:00Z");

  beforeEach(() => {
    repository = new FakeMemoryRepository();
    events = new RecordingEventPublisher();
    service = new MemoryService(repository, events, new FixedClock(now), new SequentialIdGenerator());
  });

  it("store() persists the entry and raises MemoryStored", async () => {
    const entry = await service.store({
      type: MemoryType.LONG_TERM,
      content: "The user is based in Mumbai.",
      metadata: { tags: ["profile"], source: "manual", author: "ravi" },
    });

    expect(entry.version).toBe(1);
    expect(entry.createdAt).toEqual(now);
    expect(await repository.findById(entry.id)).toEqual(entry);
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({ kind: "MemoryStored", memoryEntryId: entry.id, memoryType: MemoryType.LONG_TERM });
  });

  it("get() throws MemoryNotFoundError for an unknown id", async () => {
    await expect(service.get("nope")).rejects.toBeInstanceOf(MemoryNotFoundError);
  });

  it("get() throws MemoryExpiredError for an entry past its expiresAt", async () => {
    const entry = await service.store({
      type: MemoryType.WORKING,
      content: "scratch",
      metadata: { tags: [], source: "test", author: "test" },
      expiresAt: new Date("2025-12-31T00:00:00Z"),
    });
    await expect(service.get(entry.id, now)).rejects.toBeInstanceOf(MemoryExpiredError);
  });

  it("update() bumps the version and rejects a stale expectedVersion", async () => {
    const entry = await service.store({ type: MemoryType.SESSION, content: "v1", metadata: { tags: [], source: "test", author: "test" } });

    const updated = await service.update(entry.id, 1, { content: "v2" });
    expect(updated.version).toBe(2);
    expect(updated.content).toBe("v2");

    await expect(service.update(entry.id, 1, { content: "v3" })).rejects.toBeInstanceOf(MemoryVersionConflictError);
  });

  it("expireNow() deletes the entry and raises MemoryExpired", async () => {
    const entry = await service.store({ type: MemoryType.WORKING, content: "temp", metadata: { tags: [], source: "test", author: "test" } });
    events.published.length = 0;

    await service.expireNow(entry.id);

    expect(await repository.findById(entry.id)).toBeNull();
    expect(events.published).toHaveLength(1);
    expect(events.published[0]).toMatchObject({ kind: "MemoryExpired", memoryEntryId: entry.id });
  });

  it("purgeExpired() removes every entry past asOf and returns the count", async () => {
    await service.store({ type: MemoryType.WORKING, content: "a", metadata: { tags: [], source: "t", author: "t" }, expiresAt: new Date("2025-12-30T00:00:00Z") });
    await service.store({ type: MemoryType.WORKING, content: "b", metadata: { tags: [], source: "t", author: "t" }, expiresAt: new Date("2027-01-01T00:00:00Z") });

    const removed = await service.purgeExpired(now);
    expect(removed).toBe(1);
  });
});
