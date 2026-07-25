import type { MemoryEntry } from "../domain/entities/memory-entry.entity";
import type { MemoryQuery } from "../domain/entities/memory-query.entity";
import type { MemoryResult } from "../domain/entities/memory-result.entity";

/**
 * The port `MemoryService`/`MemoryRetriever` program against — where
 * `MemoryEntry`s actually live is an infrastructure decision behind this
 * interface. `providers/` (this package) ships two real implementations
 * (in-memory, filesystem) today; a future `PrismaMemoryRepository`
 * (backed by `@rmsm/database`, once a `MemoryEntry` model exists) can
 * implement this exact interface with zero change to any application-
 * layer code — the same "port in the domain layer, concrete adapters in
 * infrastructure" split `@rmsm/ai-prompts`' `PromptRepository` already
 * established for this platform.
 */
export interface MemoryRepository {
  findById(id: string): Promise<MemoryEntry | null>;
  query(query: MemoryQuery): Promise<MemoryResult>;
  save(entry: MemoryEntry): Promise<void>;
  delete(id: string): Promise<void>;
  /** Deletes every entry whose `expiresAt` is at or before `asOf`, returning how many were removed — the mechanism behind "Memory Expiration." */
  deleteExpired(asOf: Date): Promise<number>;
}
