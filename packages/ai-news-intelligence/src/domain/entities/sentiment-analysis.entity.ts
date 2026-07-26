import type { SentimentLabel } from "../enums/news-intelligence.enum";

export interface SentimentAnalysis {
  readonly articleId: string;
  readonly label: SentimentLabel;
  /** -1 (very negative) .. 1 (very positive). */
  readonly score: number;
  /** 0..1 — how many sentiment-bearing words were found relative to text length. */
  readonly confidence: number;
}
