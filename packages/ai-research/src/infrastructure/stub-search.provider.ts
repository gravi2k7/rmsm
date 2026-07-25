import type { SearchProvider, SearchResult } from "../repositories/search-provider.interface";

/** The real, default `SearchProvider` — deterministic, in-memory,
 * returns whatever results were pre-registered for a query via
 * `seed()`. This is deliberately the ONLY concrete `SearchProvider`
 * this package ships (no real web-search API dependency anywhere); a
 * genuine search adapter is a future package's concern. */
export class StubSearchProvider implements SearchProvider {
  private readonly resultsByQuery = new Map<string, SearchResult[]>();

  seed(query: string, results: readonly SearchResult[]): void {
    this.resultsByQuery.set(query, [...results]);
  }

  async search(query: string): Promise<readonly SearchResult[]> {
    return this.resultsByQuery.get(query) ?? [];
  }
}
