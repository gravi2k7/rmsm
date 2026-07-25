import type { MemoryEntry } from "../domain/entities/memory-entry.entity";
import type { MemoryQuery } from "../domain/entities/memory-query.entity";
import type { MemoryResult } from "../domain/entities/memory-result.entity";

/**
 * The one filtering/sorting/limiting implementation of `MemoryQuery`,
 * shared by `InMemoryMemoryProvider` and `FilesystemMemoryProvider` —
 * both hold their entries as a plain in-memory collection at query
 * time (a `Map`'s values, or everything just read off disk), so both
 * need the identical "filter, sort newest-first, cap at `limit`" logic.
 * A future `PrismaMemoryRepository`/`VectorStoreProvider`-backed
 * implementation would push this filtering into a real query instead —
 * this helper is specifically for providers that materialize the full
 * candidate set first.
 */
export function filterMemoryEntries(allEntries: readonly MemoryEntry[], query: MemoryQuery): MemoryResult {
  let entries = [...allEntries];

  if (query.conversationId !== undefined) {
    entries = entries.filter((entry) => entry.conversationId === query.conversationId);
  }
  if (query.organizationId !== undefined) {
    entries = entries.filter((entry) => entry.organizationId === query.organizationId);
  }
  if (query.type !== undefined) {
    entries = entries.filter((entry) => entry.type === query.type);
  }
  if (query.tags !== undefined) {
    const tags = query.tags;
    entries = entries.filter((entry) => entry.metadata.tags.some((tag) => tags.includes(tag)));
  }
  if (query.since !== undefined) {
    const since = query.since;
    entries = entries.filter((entry) => entry.createdAt >= since);
  }
  if (query.searchText !== undefined) {
    const needle = query.searchText.toLowerCase();
    entries = entries.filter((entry) => entry.content.toLowerCase().includes(needle));
  }

  entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const totalCount = entries.length;
  const limited = query.limit !== undefined ? entries.slice(0, query.limit) : entries;

  return { entries: limited, totalCount, truncated: limited.length < totalCount };
}
