import type { MemoryEntry } from "./memory-entry.entity";

export interface MemoryResult {
  readonly entries: readonly MemoryEntry[];
  /** Total matches before `MemoryQuery.limit` was applied — lets a
   * caller know more results exist even though `entries` was capped. */
  readonly totalCount: number;
  readonly truncated: boolean;
}
