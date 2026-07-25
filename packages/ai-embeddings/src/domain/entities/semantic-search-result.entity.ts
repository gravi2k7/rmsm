import type { IndexEntry } from "./index-entry.entity";

export interface SemanticSearchResult {
  readonly entry: IndexEntry;
  readonly similarity: number;
}
