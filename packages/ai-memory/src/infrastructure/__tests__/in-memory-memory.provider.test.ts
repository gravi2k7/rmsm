import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMemoryProvider } from "../in-memory-memory.provider";
import { MemoryType } from "../../domain/enums/memory-type.enum";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";

function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: overrides.id ?? "mem-1",
    conversationId: overrides.conversationId ?? "conv-1",
    organizationId: overrides.organizationId ?? "org-1",
    type: overrides.type ?? MemoryType.WORKING,
    content: overrides.content ?? "some content",
    metadata: overrides.metadata ?? { id: "meta-1", tags: [], source: "manual", author: "system", version: 1 },
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: overrides.expiresAt ?? null,
  };
}

describe("InMemoryMemoryProvider", () => {
  let provider: InMemoryMemoryProvider;

  beforeEach(() => {
    provider = new InMemoryMemoryProvider();
  });

  it("returns null for a missing entry", async () => {
    expect(await provider.findById("missing")).toBeNull();
  });

  it("saves and finds an entry by id", async () => {
    const entry = makeEntry();
    await provider.save(entry);
    expect(await provider.findById(entry.id)).toEqual(entry);
  });

  it("queries with filters delegated to filterMemoryEntries", async () => {
    await provider.save(makeEntry({ id: "a", type: MemoryType.WORKING }));
    await provider.save(makeEntry({ id: "b", type: MemoryType.SEMANTIC }));

    const result = await provider.query({ type: MemoryType.SEMANTIC });
    expect(result.entries.map((e) => e.id)).toEqual(["b"]);
  });

  it("deletes an entry", async () => {
    const entry = makeEntry();
    await provider.save(entry);
    await provider.delete(entry.id);
    expect(await provider.findById(entry.id)).toBeNull();
  });

  it("deletes expired entries as of a given date and returns the count removed", async () => {
    await provider.save(makeEntry({ id: "expired", expiresAt: new Date("2026-01-02T00:00:00.000Z") }));
    await provider.save(makeEntry({ id: "fresh", expiresAt: null }));

    const removed = await provider.deleteExpired(new Date("2026-01-03T00:00:00.000Z"));

    expect(removed).toBe(1);
    expect(await provider.findById("expired")).toBeNull();
    expect(await provider.findById("fresh")).not.toBeNull();
  });
});
