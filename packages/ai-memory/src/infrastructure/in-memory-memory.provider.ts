import type { MemoryEntry } from "../domain/entities/memory-entry.entity";
import type { MemoryQuery } from "../domain/entities/memory-query.entity";
import type { MemoryResult } from "../domain/entities/memory-result.entity";
import type { MemoryRepository } from "../repositories/memory-repository.interface";
import { filterMemoryEntries } from "./memory-query-filter";

/**
 * The simplest real `MemoryRepository` implementation — a `Map`, no
 * persistence beyond process lifetime. The right default for tests and
 * for any short-lived process (a CLI tool, a script) that doesn't need
 * `FilesystemMemoryProvider`'s durability.
 */
export class InMemoryMemoryProvider implements MemoryRepository {
  private readonly byId = new Map<string, MemoryEntry>();

  async findById(id: string): Promise<MemoryEntry | null> {
    return this.byId.get(id) ?? null;
  }

  async query(query: MemoryQuery): Promise<MemoryResult> {
    return filterMemoryEntries([...this.byId.values()], query);
  }

  async save(entry: MemoryEntry): Promise<void> {
    this.byId.set(entry.id, entry);
  }

  async delete(id: string): Promise<void> {
    this.byId.delete(id);
  }

  async deleteExpired(asOf: Date): Promise<number> {
    let removed = 0;
    for (const [id, entry] of this.byId) {
      if (entry.expiresAt && entry.expiresAt <= asOf) {
        this.byId.delete(id);
        removed++;
      }
    }
    return removed;
  }
}
