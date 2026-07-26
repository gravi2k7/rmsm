import type { SymbolCode } from "@rmsm/market";
import type { NewsProvider } from "../../repositories/news-provider.interface";
import type { NewsArticle } from "../../domain/entities/news-article.entity";

/** Delegates entirely to a `NewsProvider` (a future, currently-
 * unimplemented port) and dedupes by headline — never fabricates
 * articles when no provider is wired in. */
export class NewsAggregationService {
  constructor(private readonly provider: NewsProvider | undefined) {}

  async fetchLatest(symbolCode?: SymbolCode, limit = 20): Promise<readonly NewsArticle[]> {
    if (!this.provider) return [];
    const articles = await this.provider.fetchLatest(symbolCode, limit);

    const seenHeadlines = new Set<string>();
    const deduped: NewsArticle[] = [];
    for (const article of articles) {
      const key = article.headline.trim().toLowerCase();
      if (seenHeadlines.has(key)) continue;
      seenHeadlines.add(key);
      deduped.push(article);
    }
    return deduped;
  }
}
