import type { NewsEventCategory } from "../enums/news-intelligence.enum";

export interface NewsEventClassification {
  readonly articleId: string;
  readonly category: NewsEventCategory;
  readonly reason: string;
}
