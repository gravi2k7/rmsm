import type { MemoryType } from "../enums/memory-type.enum";

/**
 * Input to `MemoryRetriever`/`MemoryRepository.query()`. `searchText` is
 * matched by simple case-insensitive substring matching today — the
 * field exists now, and is validated/passed through unchanged, so a
 * real `VectorStoreProvider`-backed implementation of `MemoryRepository`
 * can start doing genuine semantic search against the exact same query
 * shape later, with zero change to any caller.
 */
export interface MemoryQuery {
  readonly conversationId?: string;
  readonly organizationId?: string;
  readonly type?: MemoryType;
  /** A memory entry matches if it carries ANY of these tags. */
  readonly tags?: readonly string[];
  readonly since?: Date;
  readonly limit?: number;
  readonly searchText?: string;
}
