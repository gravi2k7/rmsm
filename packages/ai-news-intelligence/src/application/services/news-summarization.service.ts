import type { Summarizer } from "@rmsm/ai-memory";
import type { NewsArticle } from "../../domain/entities/news-article.entity";
import type { NewsSummary } from "../../domain/entities/news-summary.entity";

/** Genuinely reuses AI-203's own `Summarizer` port (e.g. the real
 * `HeuristicSummarizer`) to condense an article's body — never a second
 * summarization implementation in this package. */
export class NewsSummarizationService {
  constructor(private readonly summarizer: Summarizer) {}

  async summarize(article: NewsArticle, targetSentences = 3): Promise<NewsSummary> {
    const narrative = await this.summarizer.summarize(article.body, targetSentences);
    return { articleId: article.id, narrative: narrative || article.headline };
  }
}
