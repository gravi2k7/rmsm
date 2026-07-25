/**
 * Descriptive, non-behavioral information about a `MemoryEntry` —
 * mirrors `@rmsm/ai-prompts`' own `PromptMetadata` shape by convention
 * (both packages independently converged on "id, tags, author, version
 * plus one domain-specific field"), not by a shared import: this
 * package has no dependency on `@rmsm/ai-prompts`.
 */
export interface MemoryMetadata {
  readonly id: string;
  readonly tags: readonly string[];
  /** Where this memory entry came from — e.g. "conversation", "manual", "summarizer", "import". */
  readonly source: string;
  /** Optional relevance/priority score in [0, 1], consulted by `MemoryCompressor` when deciding what to drop first under a token budget. Undefined is treated as neutral (0.5). */
  readonly importance?: number;
  readonly author: string;
  readonly version: number;
}
