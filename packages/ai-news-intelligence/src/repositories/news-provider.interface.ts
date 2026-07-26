import type { SymbolCode } from "@rmsm/market";
import type { NewsArticle } from "../domain/entities/news-article.entity";

/** The port to a real news feed — implemented entirely outside this
 * package. Ships with ZERO implementations, same "future seam" pattern
 * as AI-601's `IndicatorProvider`: `NewsAggregationService` has nothing
 * to aggregate until a real adapter is wired in. */
export interface NewsProvider {
  fetchLatest(symbolCode?: SymbolCode, limit?: number): Promise<readonly NewsArticle[]>;
}
