/**
 * One retrievable segment of a `MemoryEntry`'s content — the unit
 * `VectorStoreProvider` (repositories/) will operate on once a real
 * embedding provider exists. `embedding` is always `undefined` today;
 * its presence in this shape now (rather than added later) is what lets
 * `MemoryChunk` already flow through retrieval/storage code paths
 * unchanged the day a real `VectorStoreProvider` implementation lands —
 * "Future Vector Store support," per the spec, means this shape is
 * ready, not that vector search works yet.
 */
export interface MemoryChunk {
  readonly id: string;
  readonly memoryEntryId: string;
  readonly content: string;
  /** Position among this entry's other chunks, for reassembly in order. */
  readonly order: number;
  readonly embedding?: readonly number[];
}
