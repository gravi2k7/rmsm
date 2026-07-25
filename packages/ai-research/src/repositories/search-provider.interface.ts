import type { Source } from "../domain/entities/source.entity";

export interface SearchResult {
  readonly source: Source;
  readonly snippet: string;
}

/** Provider-independent search abstraction — no real search API is
 * called from this package. `StubSearchProvider` (a deterministic test
 * double) is the only concrete implementation shipped; a real
 * web-search/internal-index adapter is a future package's concern. */
export interface SearchProvider {
  search(query: string): Promise<readonly SearchResult[]>;
}
