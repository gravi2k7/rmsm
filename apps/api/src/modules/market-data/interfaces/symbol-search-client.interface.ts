import type { NormalizedSymbolSearchResult } from "./normalized-market-data.interface";

export interface SymbolSearchClient {
  search(query: string, limit?: number): Promise<NormalizedSymbolSearchResult[]>;
}
