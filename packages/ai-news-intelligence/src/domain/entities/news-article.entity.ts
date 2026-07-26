/** The consumer-facing shape a REAL `NewsProvider` (implemented
 * entirely outside this package) is expected to return — this package
 * never fetches news itself. */
export interface NewsArticle {
  readonly id: string;
  readonly headline: string;
  readonly body: string;
  readonly source: string;
  readonly publishedAt: Date;
  readonly relatedSymbols: readonly string[];
}
