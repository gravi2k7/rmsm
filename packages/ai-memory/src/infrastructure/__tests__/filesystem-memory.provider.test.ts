import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FilesystemMemoryProvider } from "../filesystem-memory.provider";
import { InvalidMemoryQueryError } from "../../domain/errors/memory-domain.errors";
import { MemoryType } from "../../domain/enums/memory-type.enum";
import type { MemoryEntry } from "../../domain/entities/memory-entry.entity";

function makeEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: overrides.id ?? "mem-1",
    conversationId: overrides.conversationId ?? "conv-1",
    organizationId: overrides.organizationId ?? "org-1",
    type: overrides.type ?? MemoryType.WORKING,
    content: overrides.content ?? "some content",
    metadata: overrides.metadata ?? { id: "meta-1", tags: ["a"], source: "manual", author: "system", version: 1 },
    version: overrides.version ?? 1,
    createdAt: overrides.createdAt ?? new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: overrides.expiresAt ?? null,
  };
}

describe("FilesystemMemoryProvider", () => {
  let rootDir: string;
  let provider: FilesystemMemoryProvider;

  beforeEach(async () => {
    rootDir = await mkdtemp(join(tmpdir(), "ai-memory-fs-"));
    provider = new FilesystemMemoryProvider(rootDir);
  });

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true });
  });

  it("returns null for a missing entry and an empty root dir that doesn't exist yet", async () => {
    const emptyProvider = new FilesystemMemoryProvider(join(rootDir, "does-not-exist"));
    expect(await emptyProvider.findById("missing")).toBeNull();
    expect(await emptyProvider.query({})).toEqual({ entries: [], totalCount: 0, truncated: false });
  });

  it("round-trips an entry through save/findById, preserving Date fields", async () => {
    const entry = makeEntry({ expiresAt: new Date("2026-02-01T00:00:00.000Z") });
    await provider.save(entry);

    const found = await provider.findById(entry.id);
    expect(found).toEqual(entry);
    expect(found?.createdAt).toBeInstanceOf(Date);
    expect(found?.expiresAt).toBeInstanceOf(Date);
  });

  it("queries across multiple saved entries using filterMemoryEntries", async () => {
    await provider.save(makeEntry({ id: "a", type: MemoryType.WORKING }));
    await provider.save(makeEntry({ id: "b", type: MemoryType.SEMANTIC }));

    const result = await provider.query({ type: MemoryType.SEMANTIC });
    expect(result.entries.map((e) => e.id)).toEqual(["b"]);
  });

  it("deletes an entry from disk", async () => {
    const entry = makeEntry();
    await provider.save(entry);
    await provider.delete(entry.id);
    expect(await provider.findById(entry.id)).toBeNull();
  });

  it("is a no-op deleting a non-existent entry", async () => {
    await expect(provider.delete("missing")).resolves.toBeUndefined();
  });

  it("deletes expired entries and returns the removed count", async () => {
    await provider.save(makeEntry({ id: "expired", expiresAt: new Date("2026-01-02T00:00:00.000Z") }));
    await provider.save(makeEntry({ id: "fresh", expiresAt: null }));

    const removed = await provider.deleteExpired(new Date("2026-01-03T00:00:00.000Z"));

    expect(removed).toBe(1);
    expect(await provider.findById("expired")).toBeNull();
    expect(await provider.findById("fresh")).not.toBeNull();
  });

  it("throws InvalidMemoryQueryError when a file on disk fails schema validation", async () => {
    await mkdir(rootDir, { recursive: true });
    await writeFile(join(rootDir, "bad.json"), JSON.stringify({ id: "bad" }), "utf-8");

    await expect(provider.query({})).rejects.toThrow(InvalidMemoryQueryError);
  });

  it("ignores non-json files in the root directory", async () => {
    await provider.save(makeEntry({ id: "a" }));
    await writeFile(join(rootDir, "README.md"), "not memory data", "utf-8");

    const result = await provider.query({});
    expect(result.entries.map((e) => e.id)).toEqual(["a"]);
  });
});
