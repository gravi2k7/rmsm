import type { MemoryType } from "../enums/memory-type.enum";
import type { MemoryMetadata } from "./memory-metadata.entity";

/**
 * The core stored unit of non-conversational memory (session/working/
 * semantic/long-term — see `MemoryType`). Conversation *turns* are
 * modeled separately by `Conversation`/`ConversationMessage`; a
 * `MemoryEntry` is what those turns (or any other source) get
 * distilled into for longer-lived recall — e.g. a `MemorySummarizer`
 * output, a fact extracted for long-term memory, or a working-memory
 * scratchpad entry for the current task.
 */
export interface MemoryEntry {
  readonly id: string;
  /** The conversation this entry is associated with, if any — `null` for
   * memory that outlives or doesn't belong to a single conversation
   * (e.g. long-term/semantic facts). */
  readonly conversationId: string | null;
  readonly organizationId: string | null;
  readonly type: MemoryType;
  readonly content: string;
  readonly metadata: MemoryMetadata;
  /** Incremented on every update — the same optimistic-concurrency shape
   * `packages/database`'s own `VersionedEntity` convention uses, kept
   * here without a dependency on that package (this one has no Prisma
   * dependency at all, by design). */
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  /** `null` = never expires. Past-dated entries are excluded from
   * `MemoryRetriever` results and are eligible for `MemoryService`'s
   * expiration sweep, per "Memory Expiration" in the spec. */
  readonly expiresAt: Date | null;
}
