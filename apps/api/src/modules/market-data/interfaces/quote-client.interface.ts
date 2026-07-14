import type { NormalizedQuote } from "./normalized-market-data.interface";

export interface QuoteClient {
  fetchLatestQuote(providerSymbol: string): Promise<NormalizedQuote>;
  fetchLatestQuotes(providerSymbols: string[]): Promise<NormalizedQuote[]>;
}
