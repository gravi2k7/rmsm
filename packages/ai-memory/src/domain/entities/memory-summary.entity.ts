/**
 * The output of `MemorySummarizer` — a condensed version of one or more
 * `MemoryEntry`/conversation turns, itself typically re-stored as a new
 * `MemoryEntry` (`type: LONG_TERM` or `SEMANTIC`) so it can be retrieved
 * like any other memory. Kept as its own shape (rather than just
 * returning a `MemoryEntry` directly) so a caller can see provenance
 * (`sourceMemoryEntryIds`) before deciding whether/how to persist it.
 */
export interface MemorySummary {
  readonly id: string;
  readonly conversationId: string | null;
  readonly sourceMemoryEntryIds: readonly string[];
  readonly summary: string;
  readonly createdAt: Date;
  readonly estimatedTokenCount: number;
}
