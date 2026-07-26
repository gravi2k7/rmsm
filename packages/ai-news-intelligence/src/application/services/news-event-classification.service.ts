import type { NewsArticle } from "../../domain/entities/news-article.entity";
import type { NewsEventClassification } from "../../domain/entities/news-event-classification.entity";
import { NewsEventCategory } from "../../domain/enums/news-intelligence.enum";

const CATEGORY_KEYWORDS: ReadonlyArray<readonly [NewsEventCategory, readonly string[]]> = [
  [NewsEventCategory.EARNINGS, ["earnings", "eps", "quarterly results", "revenue"]],
  [NewsEventCategory.CENTRAL_BANK, ["federal reserve", "central bank", "interest rate", "rate hike", "rate cut", "fomc"]],
  [NewsEventCategory.ECONOMIC_DATA, ["gdp", "inflation", "cpi", "unemployment", "jobs report", "payrolls"]],
  [NewsEventCategory.GEOPOLITICAL, ["war", "sanctions", "election", "geopolitical", "conflict"]],
  [NewsEventCategory.CORPORATE_ACTION, ["merger", "acquisition", "buyback", "dividend", "spin-off", "ipo"]],
];

/** Deterministic keyword classification — no LLM, same provider-
 * independence discipline as `SentimentAnalysisService`. */
export class NewsEventClassificationService {
  classify(article: NewsArticle): NewsEventClassification {
    const text = `${article.headline} ${article.body}`.toLowerCase();

    for (const [category, keywords] of CATEGORY_KEYWORDS) {
      const matched = keywords.find((keyword) => text.includes(keyword));
      if (matched) {
        return { articleId: article.id, category, reason: `Matched keyword "${matched}".` };
      }
    }

    return { articleId: article.id, category: NewsEventCategory.OTHER, reason: "No known category keywords matched." };
  }
}
